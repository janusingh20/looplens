# LoopLens problem bank

Generated from `src/content/problems.ts` by `npm run bank:md`. Every trace below is produced by the simulator and checked against OpenJDK 21 in CI.

The Milestone 1 slice is P01, P02, P03, P04.

| Problem | Role | Objectives | Targets | Trace |
| --- | --- | --- | --- | --- |
| P01 Adding up 1, 2, 3 | Worked example | LO1, LO2, LO3, LO4 | M3, M4 | The body runs 3 times with i = 1, 2, 3; i ends at 4; prints 6. |
| P02 Counting by threes | Faded example | LO2, LO3, LO4 | M4, M1 | The body runs 3 times with i = 2, 5, 8; i ends at 11; prints 15. |
| P03 Steps of five, bound included | Faded example | LO2, LO3, LO4 | M2, M4 | The body runs 3 times with i = 0, 5, 10; i ends at 15; prints 3. |
| P04 Odd numbers up to 5 | On your own | LO1, LO2, LO3, LO4 | M1, M2, M3, M4 | The body runs 3 times with i = 1, 3, 5; i ends at 7; prints 9. |
| P05 Counting down by threes | On your own | LO1, LO2, LO3, LO4 | M1, M4, M3 | The body runs 4 times with i = 10, 7, 4, 1; i ends at -2; prints 10 7 4 1. |
| P06 Landing on the bound | On your own | LO1, LO2, LO3 | M2, M1 | The body runs 4 times with i = 0, 4, 8, 12; i ends at 16; prints 4. |
| P07 Tripling | On your own | LO1, LO2, LO3, LO4 | M4, M1 | The body runs 3 times with i = 1, 3, 9; i ends at 27; prints 13. |
| P08 A loop that never starts | On your own | LO1, LO2, LO4 | M5, M3 | The body never runs; i ends at 8; prints 0. |
| P09 Exactly one pass | On your own | LO2, LO3 | M2, M4 | The body runs once with i = 5; i ends at 6; prints 5. |
| P10 Write the header: 3, 6, 9, 12 | Write the header (LO5) | LO5 | M2, M4 | The body runs 4 times with i = 3, 6, 9, 12; i ends at 15; prints 3 6 9 12. |
| P11 Write the header: 10, 7, 4, 1 | Write the header (LO5) | LO5 | M2, M4 | The body runs 4 times with i = 10, 7, 4, 1; i ends at -2; prints 10 7 4 1. |
| P12 Checkpoint: steps of four | Checkpoint | LO2, LO3, LO4 | M1, M4 | The body runs 5 times with i = 3, 7, 11, 15, 19; i ends at 23; prints 55. |
| P13 Checkpoint: counting down by fives | Checkpoint | LO2, LO3, LO4 | M2, M4 | The body runs 4 times with i = 20, 15, 10, 5; i ends at 0; prints 4. |
| P14 Checkpoint: an empty product | Checkpoint | LO2, LO4 | M5 | The body never runs; i ends at 4; prints 1. |

## P01 Adding up 1, 2, 3

**Worked example.** Models every phase with its name. The final update and the false check show why i ends at 4 even though the body never sees 4.

```java
int sum = 0;
for (int i = 1; i <= 3; i++) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i <= 3 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 1 |  | 0 |  |
| 2 | check | 1 | true | 0 |  |
| 3 | body | 1 |  | 1 |  |
| 4 | update | 2 |  | 1 |  |
| 5 | check | 2 | true | 1 |  |
| 6 | body | 2 |  | 3 |  |
| 7 | update | 3 |  | 3 |  |
| 8 | check | 3 | true | 3 |  |
| 9 | body | 3 |  | 6 |  |
| 10 | update | 4 |  | 6 |  |
| 11 | check | 4 | false | 6 |  |
| 12 | exit |  |  | 6 | `6` |

## P02 Counting by threes

**Faded example.** Backward fading: only the last pass is left to predict. The final update (8 becomes 11) is where M4 shows up. This is Figure 1 from the proposal.

Steps 1 to 8 are worked out; the learner predicts from step 9.

```java
int sum = 0;
for (int i = 2; i < 10; i += 3) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i < 10 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 2 |  | 0 |  |
| 2 | check | 2 | true | 0 |  |
| 3 | body | 2 |  | 2 |  |
| 4 | update | 5 |  | 2 |  |
| 5 | check | 5 | true | 2 |  |
| 6 | body | 5 |  | 7 |  |
| 7 | update | 8 |  | 7 |  |
| 8 | check | 8 | true | 7 |  |
| 9 | body | 8 |  | 15 |  |
| 10 | update | 11 |  | 15 |  |
| 11 | check | 11 | false | 15 |  |
| 12 | exit |  |  | 15 | `15` |

## P03 Steps of five, bound included

**Faded example.** Second faded example: the last two passes are left to predict. i lands exactly on the bound, so 10 <= 10 tests M2, and the final update tests M4.

Steps 1 to 4 are worked out; the learner predicts from step 5.

```java
int count = 0;
for (int i = 0; i <= 10; i += 5) {
    count++;
}
System.out.println(count);
```

| Step | Phase | i | i <= 10 | count | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 0 |  | 0 |  |
| 2 | check | 0 | true | 0 |  |
| 3 | body | 0 |  | 1 |  |
| 4 | update | 5 |  | 1 |  |
| 5 | check | 5 | true | 1 |  |
| 6 | body | 5 |  | 2 |  |
| 7 | update | 10 |  | 2 |  |
| 8 | check | 10 | true | 2 |  |
| 9 | body | 10 |  | 3 |  |
| 10 | update | 15 |  | 3 |  |
| 11 | check | 15 | false | 3 |  |
| 12 | exit |  |  | 3 | `3` |

## P04 Odd numbers up to 5

**On your own.** First problem with no support: the learner names every phase. The count prediction exposes M1 (5 passes, read off the bound) and M2 (2 passes, as if the check were i < 5).

```java
int sum = 0;
for (int i = 1; i <= 5; i += 2) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i <= 5 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 1 |  | 0 |  |
| 2 | check | 1 | true | 0 |  |
| 3 | body | 1 |  | 1 |  |
| 4 | update | 3 |  | 1 |  |
| 5 | check | 3 | true | 1 |  |
| 6 | body | 3 |  | 4 |  |
| 7 | update | 5 |  | 4 |  |
| 8 | check | 5 | true | 4 |  |
| 9 | body | 5 |  | 9 |  |
| 10 | update | 7 |  | 9 |  |
| 11 | check | 7 | false | 9 |  |
| 12 | exit |  |  | 9 | `9` |

## P05 Counting down by threes

**On your own.** A loop that counts down and prints. The variable ends at -2, below the bound, which breaks the idea that i stops at 0 or 1 (M4).

```java
for (int i = 10; i > 0; i -= 3) {
    System.out.print(i + " ");
}
```

| Step | Phase | i | i > 0 | Output |
| ---: | --- | ---: | --- | --- |
| 1 | initialize | 10 |  |  |
| 2 | check | 10 | true |  |
| 3 | body | 10 |  | `10` |
| 4 | update | 7 |  |  |
| 5 | check | 7 | true |  |
| 6 | body | 7 |  | `7` |
| 7 | update | 4 |  |  |
| 8 | check | 4 | true |  |
| 9 | body | 4 |  | `4` |
| 10 | update | 1 |  |  |
| 11 | check | 1 | true |  |
| 12 | body | 1 |  | `1` |
| 13 | update | -2 |  |  |
| 14 | check | -2 | false |  |
| 15 | exit |  |  |  |

## P06 Landing on the bound

**On your own.** i reaches exactly 16, so the final check 16 < 16 is the M2 moment. Pairs with P03, which uses <= on the same pattern.

```java
int count = 0;
for (int i = 0; i < 16; i += 4) {
    count++;
}
System.out.println(count);
```

| Step | Phase | i | i < 16 | count | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 0 |  | 0 |  |
| 2 | check | 0 | true | 0 |  |
| 3 | body | 0 |  | 1 |  |
| 4 | update | 4 |  | 1 |  |
| 5 | check | 4 | true | 1 |  |
| 6 | body | 4 |  | 2 |  |
| 7 | update | 8 |  | 2 |  |
| 8 | check | 8 | true | 2 |  |
| 9 | body | 8 |  | 3 |  |
| 10 | update | 12 |  | 3 |  |
| 11 | check | 12 | true | 3 |  |
| 12 | body | 12 |  | 4 |  |
| 13 | update | 16 |  | 4 |  |
| 14 | check | 16 | false | 4 |  |
| 15 | exit |  |  | 4 | `4` |

## P07 Tripling

**On your own.** The update multiplies, so the last step jumps from 9 to 27, far past the bound. The bound clearly tells you nothing about how many passes there are (M1).

```java
int sum = 0;
for (int i = 1; i < 10; i *= 3) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i < 10 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 1 |  | 0 |  |
| 2 | check | 1 | true | 0 |  |
| 3 | body | 1 |  | 1 |  |
| 4 | update | 3 |  | 1 |  |
| 5 | check | 3 | true | 1 |  |
| 6 | body | 3 |  | 4 |  |
| 7 | update | 9 |  | 4 |  |
| 8 | check | 9 | true | 4 |  |
| 9 | body | 9 |  | 13 |  |
| 10 | update | 27 |  | 13 |  |
| 11 | check | 27 | false | 13 |  |
| 12 | exit |  |  | 13 | `13` |

## P08 A loop that never starts

**On your own.** Zero passes: the first check 8 < 5 is already false. Targets M5 (assuming at least one pass) and the M3 belief that the body runs before the first check.

```java
int sum = 0;
for (int i = 8; i < 5; i++) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i < 5 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 8 |  | 0 |  |
| 2 | check | 8 | false | 0 |  |
| 3 | exit |  |  | 0 | `0` |

## P09 Exactly one pass

**On your own.** Contrast with P08: with <= the bound itself passes, so this loop runs exactly once. With < it would run zero times (M2).

```java
int sum = 0;
for (int i = 5; i <= 5; i++) {
    sum = sum + i;
}
System.out.println(sum);
```

| Step | Phase | i | i <= 5 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 5 |  | 0 |  |
| 2 | check | 5 | true | 0 |  |
| 3 | body | 5 |  | 5 |  |
| 4 | update | 6 |  | 5 |  |
| 5 | check | 6 | false | 5 |  |
| 6 | exit |  |  | 5 | `5` |

## P10 Write the header: 3, 6, 9, 12

**Write the header (LO5).** Transfer: the learner writes the check. Any header that produces exactly 3, 6, 9, 12 is accepted (for example i <= 12 or i < 15). i < 12 stops one pass early (M2).

Task: Fill in the check so the body runs with i = 3, 6, 9, 12 and then stops. Reference answer: `i <= 12`.

```java
for (int i = 3; i <= 12; i += 3) {
    System.out.print(i + " ");
}
```

| Step | Phase | i | i <= 12 | Output |
| ---: | --- | ---: | --- | --- |
| 1 | initialize | 3 |  |  |
| 2 | check | 3 | true |  |
| 3 | body | 3 |  | `3` |
| 4 | update | 6 |  |  |
| 5 | check | 6 | true |  |
| 6 | body | 6 |  | `6` |
| 7 | update | 9 |  |  |
| 8 | check | 9 | true |  |
| 9 | body | 9 |  | `9` |
| 10 | update | 12 |  |  |
| 11 | check | 12 | true |  |
| 12 | body | 12 |  | `12` |
| 13 | update | 15 |  |  |
| 14 | check | 15 | false |  |
| 15 | exit |  |  |  |

## P11 Write the header: 10, 7, 4, 1

**Write the header (LO5).** Transfer on a countdown. i > 0 and i >= 1 both work; i > 1 stops one pass early (M2).

Task: Fill in the check so the body runs with i = 10, 7, 4, 1 and then stops. Reference answer: `i > 0`.

```java
for (int i = 10; i > 0; i -= 3) {
    System.out.print(i + " ");
}
```

| Step | Phase | i | i > 0 | Output |
| ---: | --- | ---: | --- | --- |
| 1 | initialize | 10 |  |  |
| 2 | check | 10 | true |  |
| 3 | body | 10 |  | `10` |
| 4 | update | 7 |  |  |
| 5 | check | 7 | true |  |
| 6 | body | 7 |  | `7` |
| 7 | update | 4 |  |  |
| 8 | check | 4 | true |  |
| 9 | body | 4 |  | `4` |
| 10 | update | 1 |  |  |
| 11 | check | 1 | true |  |
| 12 | body | 1 |  | `1` |
| 13 | update | -2 |  |  |
| 14 | check | -2 | false |  |
| 15 | exit |  |  |  |

## P12 Checkpoint: steps of four

**Checkpoint.** Unscaffolded: number of passes (5), the value that ends the loop (23), and the output (55). No trace table and no feedback until all three checkpoint problems are submitted.

```java
int sum = 0;
for (int i = 3; i < 20; i += 4) {
    sum += i;
}
System.out.println(sum);
```

| Step | Phase | i | i < 20 | sum | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 3 |  | 0 |  |
| 2 | check | 3 | true | 0 |  |
| 3 | body | 3 |  | 3 |  |
| 4 | update | 7 |  | 3 |  |
| 5 | check | 7 | true | 3 |  |
| 6 | body | 7 |  | 10 |  |
| 7 | update | 11 |  | 10 |  |
| 8 | check | 11 | true | 10 |  |
| 9 | body | 11 |  | 21 |  |
| 10 | update | 15 |  | 21 |  |
| 11 | check | 15 | true | 21 |  |
| 12 | body | 15 |  | 36 |  |
| 13 | update | 19 |  | 36 |  |
| 14 | check | 19 | true | 36 |  |
| 15 | body | 19 |  | 55 |  |
| 16 | update | 23 |  | 55 |  |
| 17 | check | 23 | false | 55 |  |
| 18 | exit |  |  | 55 | `55` |

## P13 Checkpoint: counting down by fives

**Checkpoint.** Unscaffolded countdown with >=: 4 passes, ends at i = 0. With > it would be 3 passes (M2); ending at 5 is M4.

```java
int count = 0;
for (int i = 20; i >= 5; i -= 5) {
    count++;
}
System.out.println(count);
```

| Step | Phase | i | i >= 5 | count | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 20 |  | 0 |  |
| 2 | check | 20 | true | 0 |  |
| 3 | body | 20 |  | 1 |  |
| 4 | update | 15 |  | 1 |  |
| 5 | check | 15 | true | 1 |  |
| 6 | body | 15 |  | 2 |  |
| 7 | update | 10 |  | 2 |  |
| 8 | check | 10 | true | 2 |  |
| 9 | body | 10 |  | 3 |  |
| 10 | update | 5 |  | 3 |  |
| 11 | check | 5 | true | 3 |  |
| 12 | body | 5 |  | 4 |  |
| 13 | update | 0 |  | 4 |  |
| 14 | check | 0 | false | 4 |  |
| 15 | exit |  |  | 4 | `4` |

## P14 Checkpoint: an empty product

**Checkpoint.** Unscaffolded zero pass loop: prints 1 because the body never runs (M5).

```java
int product = 1;
for (int i = 4; i <= 3; i++) {
    product = product * i;
}
System.out.println(product);
```

| Step | Phase | i | i <= 3 | product | Output |
| ---: | --- | ---: | --- | ---: | --- |
| 1 | initialize | 4 |  | 1 |  |
| 2 | check | 4 | false | 1 |  |
| 3 | exit |  |  | 1 | `1` |

## Feedback messages, one example each

### M1 Counting passes from the bound

Belief: Counts iterations from the upper bound, ignoring the start value and the step size.

> Not quite. The bound, 5, tells the loop when to stop, not how many passes to make. The body saw `i` = 1, 3, 5: that's 3 passes, because `i` starts at 1 and goes up by 2 each time.

Rule: To count passes, list the values the body sees. The bound only says when to stop.

### M2 < versus <=

Belief: Treats < and <= (or > and >=) as if they were the same check.

> Not quite. `16 < 16` is false. `<` means strictly less than, so the check fails as soon as `i` reaches 16. With `<=` it would be true and the body would run once more.

Rule: `<` stops before the bound. `<=` lets the bound itself through.

### M3 Order of the phases

Belief: Runs the loop phases in the wrong order, for example the update before the body or the body before the first check.

> Not quite. The check runs before the body, even on the very first pass. Right after `int i = 1`, Java asks whether `i <= 5` and runs the body only if the answer is true.

Rule: Initialize once, then check, body, update, and repeat. The check always comes before the body.

### M4 Where the loop variable ends

Belief: Expects the loop variable to end at the last value it held inside the body.

> Not quite. The update `i += 3` runs after every pass through the body, including the last one, so `i` becomes 11. Only then is `11 < 10` checked; it is false, so the loop ends and `sum` stays 15.

Rule: The update runs after every pass, so the loop variable ends one step past the last value the body used.

### M5 Loops that run zero times

Belief: Assumes the body always runs at least once.

> Not quite. `8 < 5` is false, and Java runs this check before the first pass. So the body never runs, and `sum` stays 0. A for loop can run zero times.

Rule: The check comes first. If it is false right away, the body runs zero times.
