Feature: Setting up a profile
  Affordo cannot weigh a purchase until it knows what an hour of your life is
  worth. A first-time visitor is sent to a four-step wizard and cannot reach the
  rest of the app until they finish it.

  Scenario: A first-time visitor is sent to onboarding
    Given I have never used Affordo
    When I open the app
    Then I am taken to "/onboarding"
    And I see "Set up · Affordo" in the browser tab

  Scenario: The welcome step asks for nothing
    Given I have never used Affordo
    When I open the app
    Then the primary action reads "Start →"
    And I cannot go back

  Scenario: The income step will not let me continue while it is empty
    Given I have never used Affordo
    And I open the app
    When I press "Start →"
    Then I cannot continue

  Scenario: Filling in the income step unlocks the rest of the wizard
    Given I have never used Affordo
    And I open the app
    And I press "Start →"
    When I enter my income details
    Then I can continue

  Scenario: Finishing the wizard takes me to my goals
    Given I have never used Affordo
    When I complete the onboarding wizard
    Then I am taken to "/goals"
    And my profile is saved

  Scenario: A returning visitor skips onboarding entirely
    Given I have a saved profile
    When I open the app
    Then I am taken to "/goals"
