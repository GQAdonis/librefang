//! Project the selected runtime's catalog into the dashboard model contract.
use serde_json::{json, Value};

pub(super) async fn selected_models() -> (Vec<Value>, Value) {
    #[cfg(feature = "uar-driver")]
    {
        match librefang_llm_drivers::drivers::uar::selected_model_catalog().await {
            Ok(catalog) => {
                let models = rows(&catalog);
                let state = if models.is_empty() { "empty" } else { "ready" };
                (models, json!({ "state": state }))
            }
            Err(error) => (
                Vec::new(),
                json!({ "state": "unavailable", "error": error.to_string() }),
            ),
        }
    }
    #[cfg(not(feature = "uar-driver"))]
    {
        (
            Vec::new(),
            json!({ "state": "unavailable", "error": "UAR driver is not packaged" }),
        )
    }
}

#[cfg(feature = "uar-driver")]
fn row(id: String, detail: &Value) -> Value {
    json!({
        "id": id, "display_name": detail.get("name").and_then(Value::as_str).unwrap_or(&id),
        "provider": "uar", "tier": "custom", "modality": "text", "available": true,
        "context_window": detail.pointer("/limit/context").and_then(Value::as_u64).unwrap_or(0),
        "max_output_tokens": detail.pointer("/limit/output").and_then(Value::as_u64).unwrap_or(0),
        "input_cost_per_m": detail.pointer("/cost/input").and_then(Value::as_f64).unwrap_or(0.0),
        "output_cost_per_m": detail.pointer("/cost/output").and_then(Value::as_f64).unwrap_or(0.0),
        "pricing_known": detail.pointer("/cost/input").and_then(Value::as_f64).is_some() && detail.pointer("/cost/output").and_then(Value::as_f64).is_some(), "limits_known": detail.pointer("/limit/context").and_then(Value::as_u64).is_some_and(|value| value > 0) && detail.pointer("/limit/output").and_then(Value::as_u64).is_some_and(|value| value > 0),
        "supports_tools": detail.get("tool_call").and_then(Value::as_bool).unwrap_or(false),
        "supports_streaming": detail.get("streaming").and_then(Value::as_bool).unwrap_or(false),
        "supports_thinking": detail.get("reasoning").and_then(Value::as_bool).unwrap_or(false),
        "supports_vision": detail.pointer("/modalities/input").and_then(Value::as_array)
            .is_some_and(|inputs| inputs.iter().any(|input| input.as_str() == Some("image"))),
        "aliases": []
    })
}

#[cfg(feature = "uar-driver")]
fn rows(catalog: &Value) -> Vec<Value> {
    // The admitted endpoint may expose the UAR grouped catalog or an
    // OpenAI-compatible served-alias catalog. Never substitute static models.
    if let Some(data) = catalog.get("data").and_then(Value::as_array) {
        return data
            .iter()
            // Full-agent targets belong to the explicit delegation selector,
            // never to the legacy inference-only driver/model field.
            .filter(|model| model.pointer("/uar/kind").and_then(Value::as_str) != Some("agent")
                && model.pointer("/uar/available").and_then(Value::as_bool) != Some(false))
            .filter_map(|model| {
                model
                    .get("id")
                    .and_then(Value::as_str)
                    .map(|id| row(id.to_owned(), model))
            })
            .collect();
    }
    let Some(providers) = catalog.as_object() else {
        return Vec::new();
    };
    providers
        .iter()
        .filter(|(_, provider)| provider.get("configured").and_then(Value::as_bool) == Some(true))
        .flat_map(|(provider_id, provider)| {
            provider
                .get("models")
                .and_then(Value::as_object)
                .into_iter()
                .flat_map(move |models| {
                    models.iter().filter_map(move |(id, detail)| {
                        if detail.get("enabled").and_then(Value::as_bool) != Some(true) {
                            return None;
                        }
                        // UAR consumes the first segment as the provider and
                        // compares the remainder to the opaque registered ID.
                        // A served alias may itself include that same prefix.
                        let id = format!("{provider_id}/{id}");
                        Some(row(id, detail))
                    })
                })
        })
        .collect()
}
