# 🎮 **Game Design Document (GDD)**

**Title:** Gravity Pulse
**Genre:** Arcade / Survival / Reflex
**Platform:** HTML5 (Canvas + JS)
**Target Audience:** Casual to core players, age 10+

---

## **1. Game Concept**

Gravity Pulse is a minimalist arcade survival game where the player navigates a small arena, balancing risk and reward.
The game is built around **Attractor Fields** — invisible forces that guide player behavior, creating flow, tension, and emergent mastery.

* **Core Fun:** Discover invariants in a chaotic system while being subtly guided by invisible attractor fields.
* **Player Goal:** Survive as long as possible and collect points.

---

## **2. Core Mechanics**

| Mechanic           | Description                                       | Attractor Type       |
| ------------------ | ------------------------------------------------- | -------------------- |
| Player Movement    | Arrow keys / WASD; small pull toward arena center | Spatial              |
| Enemy Waves        | Spawn at edges, move toward player                | Temporal + Systemic  |
| Rewards            | Floating points/health near enemies               | Systemic             |
| Dash               | Short burst toward attractor for evasion          | Spatial / Temporal   |
| Score Multiplier   | Bonus points for risky positioning                | Systemic / Cognitive |
| Difficulty Scaling | Spawn rate & enemy speed increase over time       | Entropy / Pressure   |

---

## **3. Attractor Fields**

1. **Spatial:** Center of arena subtly pulls player → natural positioning.
2. **Temporal:** Enemies and rewards spawn in rhythmic waves → establishes flow.
3. **Systemic:** High-risk areas contain high rewards → encourages strategic risk-taking.
4. **Cognitive:** Player learns safe vs dangerous zones → mastery emerges naturally.

---

## **4. Game Loop**

1. Player navigates arena, moving naturally toward attractor zones.
2. Enemy waves spawn in patterns, gradually increasing difficulty.
3. Rewards appear in risky zones → attract player toward challenge.
4. Player collects rewards while avoiding enemies.
5. Player score increases; multiplier grows for risk-taking.
6. Game ends if player collides with enemy.
7. Replay reinforced by attractor-based learning and score optimization.

---

## **5. Visual & Audio Style**

* **Graphics:** Minimalist shapes (circles for player/enemies, squares for pickups)
* **Colors:** Contrasting colors for clarity (player = bright, enemies = red, rewards = yellow)
* **Audio:** Simple pulse/heartbeat rhythm to reinforce temporal attractors
* **Effects:** Subtle glow for center zone, particle effect on collection or hit

---

## **6. Difficulty & Flow**

* **Difficulty Gradient:** Slowly increasing enemy speed and spawn rate
* **Entropy Control:** Number of enemies & reward placement dynamically adjusted
* **Compression Cycles:** Alternating chaos & calm phases to maintain flow
* **Flow Principle:** Players naturally learn attractor patterns → deeper engagement

---

## **7. Controls**

* **Movement:** Arrow keys / WASD
* **Dash:** Spacebar or click (toward attractor center)
* **Optional Touch:** Drag/tap to move for mobile HTML5

---

## **8. Scoring**

* 10 points per reward collected
* Multiplier for risky positioning (near enemies or edge zones)
* Optional combo bonuses for consecutive safe collections

---

## **9. Core Loop Diagram**

```
[Start Game] → [Move & Dodge] → [Collect Rewards / Risk Zones] → [Enemy Waves / Pressure] → [Score + Flow Feedback] → [Player Death?] → [Replay]
```

---

## **10. Technical Notes (HTML5)**

* **Canvas:** `<canvas>` element
* **Rendering:** requestAnimationFrame
* **Input:** `keydown` / `keyup`
* **Physics:** Simple vector math (player/enemy movement + attractor pull)
* **AI:** Homing enemies toward player + attractor influence
* **Difficulty:** Timer-based scaling of speed/spawn rate
* **Score System:** Object tracking with multiplier logic

---

## **11. Optional Deep Features (0.001% Level)**

* **Dynamic Attractor Fields:** Safe zone slowly moves over time → player must adapt
* **Opposing Fields:** Some enemies push player into risky zones → tension
* **Meta-Invariants:** Player discovers “enemy pattern rules” → mastery dopamine
* **Cognitive Feedback:** Subtle visual/audio cues for attractor reinforcement

---

## **12. Development Milestones**

| Milestone  | Task                                 | 
| ---------- | ------------------------------------ | 
| Prototype  | Player movement + attractor pull     |
| Enemy AI   | Spawn waves + homing                 | 
| Rewards    | Point & risk placement               | 
| Scoring    | Multipliers + UI                     | 
| Difficulty | Dynamic scaling + compression cycles |
| Polish     | Visual/audio cues                    |
| Testing    | Flow tuning                          | 

---

This GDD is **ready for implementation**.
