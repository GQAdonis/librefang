Feature: UAR sidecar availability
  BossFang operators need visible proof that the supervised UAR endpoint can
  discover models, complete a provider test, and answer through the chat UI.

  Scenario: Complete a chat prompt through UAR
    Given BossFang is connected to a healthy UAR endpoint
    When I open the UAR provider controls
    And I complete a UAR provider test
    And I send a prompt from the UAR-backed agent chat
    Then the chat shows the UAR completion
