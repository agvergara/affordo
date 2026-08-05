Feature: Weighing purchases against my working life
  A goal is a purchase I am considering. Affordo prices it in hours and work
  days of my own life and tells me which of four routes to it I am on.

  Background:
    Given I have a saved profile
    And I am on my goals dashboard

  Scenario: An empty dashboard invites a first goal
    Then I see "No decisions to reckon with yet."
    And the saved-goals count reads 0

  Scenario: Adding a goal puts it on the dashboard
    When I add a goal "MacBook" priced 2500
    Then I see a goal named "MacBook"
    And the saved-goals count reads 1

  Scenario: A goal I can already afford says so
    Given my savings are 5000
    When I add a goal "Headphones" priced 300
    Then the goal "Headphones" shows the verdict "Afford"

  Scenario: A goal within a year of saving is a stretch
    When I add a goal "Laptop" priced 3000
    Then the goal "Laptop" shows the verdict "Stretch"

  Scenario: A goal beyond reach says so plainly
    When I add a goal "House" priced 500000
    Then the goal "House" shows the verdict "Cannot"

  Scenario: Editing a goal updates it in place
    Given I have a goal "Down payment" priced 20000
    When I rename it to "House deposit" and reprice it to 25000
    Then I see a goal named "House deposit"
    And I do not see a goal named "Down payment"
    And the saved-goals count reads 1

  Scenario: An edit does not restamp the creation date
    Given I have a goal "Down payment" created on 15 January 2020
    When I rename it to "House deposit" and reprice it to 25000
    Then the goal still shows its 2020 creation date

  Scenario: Removing a goal is permanent
    Given I have a goal "Down payment" priced 20000
    When I remove it
    Then I see "No decisions to reckon with yet."
    And the goal is still gone after a reload

  Scenario: Goals survive a reload
    When I add a goal "MacBook" priced 2500
    And I reload the page
    Then I see a goal named "MacBook"
