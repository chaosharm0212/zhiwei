---
title: "不写媒体查询的响应式"
date: 2025-07-06
tags: ["CSS", "设计"]
summary: "clamp、容器查询、grid auto-fit——三种手段能覆盖大部分响应式需求，而且比媒体查询更不容易写坏。"
---

大多数响应式代码烂掉，不是因为写得不够多，而是因为断点写得太随意：`768px`、`1024px` 这些数字来自某款手机的尺寸，和你自己的版面没有任何关系。

过去两年我逐渐把大部分媒体查询从代码里删掉，换成下面三种手段。

## 一、用 clamp 做流式尺寸

字号、间距、边距这类值，本来就不该在断点处突变。

```css
h1 {
  font-size: clamp(2rem, 4vw + 1rem, 4.5rem);
  line-height: 1.1;
}

.hero {
  padding-block: clamp(2.5rem, 7vw, 6rem);
}
```

`clamp(最小值, 首选值, 最大值)` 的意思是：让它在区间里随视口连续变化，但永远不越界。一个声明替代了三条断点规则，而且中间任何宽度都是合理的。

一个小技巧：首选值用 `vw + rem` 而不是纯 `vw`，可以避免用户放大字号时文字不跟着变大。

## 二、grid auto-fit 自动列数

卡片列表是最典型的场景。不需要知道「几列」，只需要知道「一格最窄多少」：

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr));
  gap: 1.5rem;
}
```

三个细节值得记住：

- `auto-fit` 会折叠空轨道，`auto-fill` 不会——列表项少时用前者更自然；
- `minmax(min(260px, 100%), 1fr)` 里的 `min()` 是给窄屏兜底的。没有它，260px 的最小宽度会导致横向溢出；
- 配合 `gap` 而不是 `margin`，间距逻辑会简单很多。

## 三、容器查询让组件自己决定

媒体查询问的是「视口多大」，而组件真正关心的是「我被放进多宽的容器里」。同一个卡片，在侧栏和在主区域应该长得不一样，但视口宽度对此一无所知。

```css
.card-wrap {
  container-type: inline-size;
}

.card {
  display: block;
}

@container (min-width: 420px) {
  .card {
    display: grid;
    grid-template-columns: 120px 1fr;
    gap: 1.25rem;
    align-items: start;
  }
}
```

组件从此可以在任何上下文里复用，父级改布局时不需要回来补断点。

## 什么时候还是需要媒体查询

有三种情况，我仍然老老实实写媒体查询：

1. **布局语义变化。** 侧栏从右侧移到下方、导航变成抽屉——这不是「同一个东西缩放」，而是「换了一个东西」。
2. **交互模式变化。** 悬停效果只在有指针的设备上启用：`@media (hover: hover)`。
3. **打印与动效偏好。** `@media print`、`@media (prefers-reduced-motion)`。

也就是说：**连续变化用 clamp，重复排列用 grid，局部适配用容器查询，只有「换布局」才用媒体查询**。

把这条规则贴在脑子里之后，我的样式表里剩下的断点不足原来的三分之一，而视觉上反而更少出现「某个宽度下坏掉」的情况。
