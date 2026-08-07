Feature: Splitting my surplus between competing goals
  My goals compete for the same money. Affordo lets me say how much of each
  month goes to which goal, and tells me how long each one then takes.

  Background:
    Given I have a saved profile
    And I have a goal "MacBook" priced 1200
    And I have a goal "Holiday" priced 900

  Scenario: A goal I have not assigned anything to is simply not in the plan
    When I open the comparison
    Then the goal "MacBook" is not in the plan

  Scenario: Affordo tells me nothing is assigned yet
    When I open the comparison
    Then I see "Nothing is assigned yet."

  Scenario: Assigning an amount tells me how long that goal takes
    When I open the comparison
    And I assign 100 a month to "MacBook"
    Then the goal "MacBook" takes 12 months

  Scenario: A bigger amount each month means a shorter wait
    When I open the comparison
    And I assign 300 a month to "MacBook"
    Then the goal "MacBook" takes 4 months

  Scenario: Affordo tells me what wanting both costs me
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I assign 200 a month to "Holiday"
    Then Affordo tells me "MacBook" is later than it would be on its own
    And Affordo tells me "Holiday" is later than it would be on its own

  Scenario: A goal I put my whole surplus behind is not held up by anything
    When I open the comparison
    And I assign 1500 a month to "MacBook"
    Then Affordo does not say "MacBook" is held up

  Scenario: A goal I have not assigned anything to is not held up either
    When I open the comparison
    And I assign 100 a month to "Holiday"
    Then Affordo does not say "MacBook" is held up

  Scenario: Affordo totals what I have committed against what I have
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I assign 200 a month to "Holiday"
    Then Affordo says I have assigned 300 a month

  Scenario: Money I already have counts towards the goal
    Given my savings are 900
    When I open the comparison
    And I assign 100 a month to "Holiday"
    Then the goal "Holiday" is already paid for

  Scenario: Taking a goal back out of the plan
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I take "MacBook" back out of the plan
    Then the goal "MacBook" is not in the plan
    And I still have a goal named "MacBook"

  Scenario: My split is remembered
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I come back later
    Then the goal "MacBook" takes 12 months

  Scenario: Comparing goals does not change what a goal on its own says
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I go back to my goals dashboard
    Then the goal "MacBook" shows the verdict "Stretch"

  Scenario: Affordo tells me when I have committed more than I have
    Given my monthly expenses leave me 200 a month
    When I open the comparison
    And I assign 500 a month to "MacBook"
    Then Affordo warns me the plan needs money I do not have

  Scenario: With nothing left over each month, Affordo says so
    Given my expenses meet my income
    When I open the comparison
    And I assign 100 a month to "MacBook"
    Then Affordo tells me there is no monthly surplus to share
    And the goal "MacBook" cannot be reached

  Scenario: My goals dashboard admits when a goal is being held up
    When I open the comparison
    And I assign 100 a month to "MacBook"
    And I assign 100 a month to "Holiday"
    And I go back to my goals dashboard
    Then the goal "MacBook" says it is sharing with 1 other goal
