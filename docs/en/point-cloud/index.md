---
description: Representation, matching, registration and reconstruction methods for 3D point clouds.
---

# Point Cloud

Representation, matching, registration and reconstruction methods for 3D point clouds.

## Scope

Registration, matching and reconstruction.

Pin down the point coordinate frames, units and correspondences before choosing a geometric model and error metric. When evaluating, record accuracy, success rate and compute cost together.

## Start here

Take rigid registration with known correspondences as an example: find a rotation $R$ and translation $t$ that bring corresponding points as close as possible:

$$
(R^*, t^*) = \operatorname*{argmin}_{R \in SO(3),\,t \in \mathbb{R}^3}
\sum_{i=1}^{n} \left\|Rp_i + t - q_i\right\|_2^2
$$

Here $p_i$ and $q_i$ are corresponding points. Unknown correspondences, outliers and low overlap change the actual solution path; this objective is not equivalent to a complete registration system.
