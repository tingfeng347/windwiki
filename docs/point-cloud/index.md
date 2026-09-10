---
description: 整理三维点云的表示、匹配、配准与重建方法。
---

# Point Cloud

整理三维点云的表示、匹配、配准与重建方法。

## 知识范围

Registration、Matching、Reconstruction。

明确点的坐标系、单位和对应关系，再选择几何模型与误差度量。评测时同时记录精度、成功率和计算开销。

## 阅读入口

以已知对应关系的刚体配准为例，寻找旋转 $R$ 与平移 $t$，让对应点尽量接近：

$$
(R^*, t^*) = \operatorname*{argmin}_{R \in SO(3),\,t \in \mathbb{R}^3}
\sum_{i=1}^{n} \left\|Rp_i + t - q_i\right\|_2^2
$$

这里 $p_i$、$q_i$ 是对应点。未知对应关系、离群点与低重叠率会改变实际求解流程；不能把这个目标函数直接等同于完整配准系统。
