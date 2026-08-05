Feature: Changing my profile
  Every verdict is derived from the profile, so editing it re-answers every goal
  at once. Nothing is written until I press Save.

  Background:
    Given I have a saved profile
    And I am on the settings screen

  Scenario: Edits are not saved until I say so
    When I change my salary to 4000
    And I reload the page
    Then my salary is still 2000

  Scenario: Saving persists the change and keeps me here
    When I change my salary to 4000
    And I press "Save"
    Then I see a confirmation
    And I am still on the settings screen
    And my salary is 4000 after a reload

  Scenario: A profile change re-answers every saved goal
    Given I have a goal "Laptop" priced 3000
    And my savings are 5000
    When I am on my goals dashboard
    Then the goal "Laptop" shows the verdict "Afford"

  Scenario: Resetting asks first, and does nothing if I decline
    Given I have a goal "Laptop" priced 3000
    And I am on the settings screen
    When I press "Reset everything" and decline the confirmation
    Then I am still on the settings screen
    And my profile is saved

  Scenario: Confirming the reset erases everything and sends me back to onboarding
    Given I have a goal "Laptop" priced 3000
    And I am on the settings screen
    When I press "Reset everything" and accept the confirmation
    Then I am taken to "/onboarding"
    And Affordo no longer considers me set up
    And no goals are saved
