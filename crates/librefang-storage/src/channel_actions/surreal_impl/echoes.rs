use super::*;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
struct ProviderEcho {
    echo_id: String,
    action_id: String,
    target: ReplyTargetScope,
    native_message_id: String,
    recorded_at: String,
}

impl ChannelActionStore {
    /// Bind the provider's outbound message ID to a claimed or completed
    /// reply action. Repeating the same binding is idempotent; a different
    /// action for the same native echo is a conflict.
    pub async fn bind_provider_echo(
        &self,
        action_id: &str,
        target: &ReplyTargetScope,
        native_message_id: &str,
    ) -> StorageResult<String> {
        validate_digest(action_id, "action_id")?;
        required(native_message_id, "native_message_id")?;
        let action: ActionReceipt = self
            .read(ACTIONS, action_id)
            .await?
            .ok_or_else(|| StorageError::InvalidConfig("reply action is absent".into()))?;
        if action.kind != ActionKind::Reply
            || action.reply_target.as_ref() != Some(target)
            || !matches!(
                action.state,
                ActionState::Claimed | ActionState::Completed | ActionState::Uncertain
            )
        {
            return Err(StorageError::InvalidConfig(
                "provider echo does not match an issued exact-scope reply".into(),
            ));
        }
        let echo_id = digest_parts(&["channel-provider-echo-v1", &target.key(), native_message_id]);
        if let Some(existing) = self.read::<ProviderEcho>(ECHOES, &echo_id).await? {
            return same_echo(existing, action_id, target, native_message_id);
        }
        let row = ProviderEcho {
            echo_id: echo_id.clone(),
            action_id: action_id.into(),
            target: target.clone(),
            native_message_id: native_message_id.into(),
            recorded_at: now(),
        };
        let sql = format!("CREATE ONLY {ECHOES}:{echo_id} CONTENT $echo");
        match self
            .db
            .query(sql)
            .bind(("echo", encode(row)?))
            .await
            .map_err(db_error)?
            .check()
        {
            Ok(_) => Ok(echo_id),
            Err(error) => match self.read(ECHOES, &echo_id).await? {
                Some(existing) => same_echo(existing, action_id, target, native_message_id),
                None => Err(db_error(error)),
            },
        }
    }

    /// Resolve a provider echo to the action that already posted it. An
    /// inbound bridge must check this before admitting the echo as a source.
    pub async fn lookup_provider_echo(
        &self,
        target: &ReplyTargetScope,
        native_message_id: &str,
    ) -> StorageResult<Option<String>> {
        required(native_message_id, "native_message_id")?;
        let echo_id = digest_parts(&["channel-provider-echo-v1", &target.key(), native_message_id]);
        Ok(self
            .read::<ProviderEcho>(ECHOES, &echo_id)
            .await?
            .map(|echo| echo.action_id))
    }
}

fn same_echo(
    existing: ProviderEcho,
    action_id: &str,
    target: &ReplyTargetScope,
    native_message_id: &str,
) -> StorageResult<String> {
    if existing.action_id != action_id
        || existing.target != *target
        || existing.native_message_id != native_message_id
    {
        return Err(StorageError::InvalidConfig(
            "native provider echo maps to a different reply action".into(),
        ));
    }
    Ok(existing.echo_id)
}
