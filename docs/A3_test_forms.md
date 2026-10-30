# A3 pre test and post test (draft, Milestone 1)

Two parallel forms, A and B, of ten items each. Half of the participants take Form A before practice and Form B after; the other half take them in the opposite order, so a difference between forms cannot pass for learning. In the full experience these screens live inside LoopLens (Milestone 2); this file is the content draft and answer key.

Every answer key below was produced by running the code on OpenJDK 21, not worked out by hand.

## Design

* **Items 1 to 8: tracing, in four contrasting pairs.** The two items in a pair differ in exactly one feature (the start value, `<` versus `<=`, or the step size), so a learner with a misconception can get one item right for the wrong reason and the other wrong. That pattern is the evidence.
* **Items 9 and 10: write the check** so the loop produces a given range (LO5, transfer).
* **Code is plain text, with no trace table**, so the tool's own scaffolding cannot inflate the score.
* **Every item has a confidence rating.** A wrong answer given with confidence 3 or 4 points to a stable misconception; a wrong answer at 1 or 2 points to a knowledge gap.
* **Open responses, not multiple choice**, so no option can cue the right answer, and wrong answers keep their misconception signature.

## Instructions shown to the learner

> Answer from the code alone. Please don't run it: we want to know what you expect Java to do. There is no penalty for being wrong, and your answers are saved without your name.
>
> After each answer, say how sure you are: **1** I guessed, **2** Not sure, **3** Fairly sure, **4** Certain.

## Form A

**A1.** How many times does the body run?

```java
for (int i = 0; i < 6; i++) {
    System.out.println("hi");
}
```

**A2.** How many times does the body run?

```java
for (int i = 2; i < 6; i++) {
    System.out.println("hi");
}
```

**A3.** What does this print?

```java
for (int i = 1; i < 4; i++) {
    System.out.print(i + " ");
}
```

**A4.** What does this print?

```java
for (int i = 1; i <= 4; i++) {
    System.out.print(i + " ");
}
```

**A5.** The loop ends when a check is false. What is the value of `i` in that last check?

```java
for (int i = 0; i < 5; i++) {
    System.out.print("*");
}
```

**A6.** The loop ends when a check is false. What is the value of `i` in that last check?

```java
for (int i = 0; i < 5; i += 2) {
    System.out.print("*");
}
```

**A7.** What does this print?

```java
int total = 10;
for (int i = 5; i < 5; i++) {
    total = total + i;
}
System.out.println(total);
```

**A8.** What does this print?

```java
int total = 10;
for (int i = 5; i <= 5; i++) {
    total = total + i;
}
System.out.println(total);
```

**A9.** Fill in the check so the body runs with `i` = 0, 1, 2, 3, 4 and then stops.

```java
for (int i = 0; ________; i++) {
```

**A10.** Fill in the check so the body runs with `i` = 2, 5, 8 and then stops.

```java
for (int i = 2; ________; i += 3) {
```

## Form B

**B1.** How many times does the body run?

```java
for (int i = 0; i < 7; i++) {
    System.out.println("hi");
}
```

**B2.** How many times does the body run?

```java
for (int i = 3; i < 7; i++) {
    System.out.println("hi");
}
```

**B3.** What does this print?

```java
for (int i = 2; i < 5; i++) {
    System.out.print(i + " ");
}
```

**B4.** What does this print?

```java
for (int i = 2; i <= 5; i++) {
    System.out.print(i + " ");
}
```

**B5.** The loop ends when a check is false. What is the value of `i` in that last check?

```java
for (int i = 0; i < 8; i++) {
    System.out.print("*");
}
```

**B6.** The loop ends when a check is false. What is the value of `i` in that last check?

```java
for (int i = 0; i < 8; i += 3) {
    System.out.print("*");
}
```

**B7.** What does this print?

```java
int total = 20;
for (int i = 6; i < 6; i++) {
    total = total + i;
}
System.out.println(total);
```

**B8.** What does this print?

```java
int total = 20;
for (int i = 6; i <= 6; i++) {
    total = total + i;
}
System.out.println(total);
```

**B9.** Fill in the check so the body runs with `i` = 1, 2, 3, 4, 5, 6 and then stops.

```java
for (int i = 1; ________; i++) {
```

**B10.** Fill in the check so the body runs with `i` = 1, 5, 9 and then stops.

```java
for (int i = 1; ________; i += 4) {
```

## Answer key and misconception signatures

| Item | Objective | Correct | Signature wrong answers |
| --- | --- | --- | --- |
| A1 | LO2 | 6 | 7 (M2). A right answer here is also what M1 gives; A2 separates them. |
| A2 | LO2 | 4 | 6 (M1, read off the bound); 5 (M2) |
| A3 | LO3, LO1 | `1 2 3` | `1 2 3 4` (M2); `2 3 4` (M3, update before body) |
| A4 | LO3, LO1 | `1 2 3 4` | `1 2 3` (M2); `2 3 4 5` (M3) |
| A5 | LO3 | 5 | 4 (M4, last value the body used). "Stops at the bound" also gives 5; A6 separates them. |
| A6 | LO3 | 6 | 4 (M4, last value the body used); 5 (stops at the bound, M4) |
| A7 | LO4, LO2 | 10 | 15 (M5, assumes one pass); 16 (M5 and M3 together) |
| A8 | LO4, LO1 | 15 | 10 (M2, treats `<=` like `<`); 16 (M3) |
| A9 | LO5 | `i < 5`, `i <= 4`, or `i != 5` | `i <= 5` or `i < 4` (M2, one pass off) |
| A10 | LO5 | `i < 9`, `i < 10`, `i < 11`, `i <= 8`, `i <= 9`, `i <= 10`, or `i != 11` | `i < 8` (stops after 5); `i <= 11` or `i < 12` (runs with 11) |
| B1 | LO2 | 7 | 8 (M2) |
| B2 | LO2 | 4 | 7 (M1); 5 (M2) |
| B3 | LO3, LO1 | `2 3 4` | `2 3 4 5` (M2); `3 4 5` (M3) |
| B4 | LO3, LO1 | `2 3 4 5` | `2 3 4` (M2); `3 4 5 6` (M3) |
| B5 | LO3 | 8 | 7 (M4, last value the body used). "Stops at the bound" also gives 8; B6 separates them. |
| B6 | LO3 | 9 | 6 (M4, last value the body used); 8 (stops at the bound, M4) |
| B7 | LO4, LO2 | 20 | 26 (M5); 27 (M5 and M3) |
| B8 | LO4, LO1 | 26 | 20 (M2); 27 (M3) |
| B9 | LO5 | `i < 7`, `i <= 6`, or `i != 7` | `i < 6` or `i <= 7` (M2) |
| B10 | LO5 | any `i < b` with b from 10 to 13, any `i <= b` with b from 9 to 12, or `i != 13` | `i < 9` (stops after 5); `i <= 13` (runs with 13) |

Header answers are scored by running the learner's check, so any check that produces exactly the target values counts, including ones not listed here.

## Scoring

* One point per item, ten points per form. Output answers are compared after trimming spaces.
* **Gain by objective:** LO2 from items 1, 2, 7; LO3 from items 3 to 6; LO4 from items 7 and 8; LO5 from items 9 and 10. LO1 (phase order) is read from the M3 signatures on items 3, 4, and 8, the items tagged LO1: how many appear before practice and how many after.
* **Normalized gain** per learner and per objective: (post minus pre) divided by (maximum minus pre), following Hake (1998).
* **Confident versus unsure errors:** for each misconception, count signature answers given at confidence 3 or 4 (stable misconception) and at 1 or 2 (gap). This feeds RQ3 in the evaluation plan.
* Learners scoring 9 or 10 on the pre test are analyzed separately (ceiling).

## Still to do (Milestone 2)

* Build both forms as screens inside LoopLens, with the confidence rating under each item and random assignment of form order.
* Pilot both forms with two or three classmates to check that A and B are similar in difficulty; adjust any item that one group finds much harder.
