---
title: "TypeScript 类型体操的隐形成本"
date: 2025-09-21
tags: ["TypeScript", "工程化"]
summary: "类型能表达一切，不代表应该表达一切。聊聊类型复杂度的边际收益，以及什么时候该主动收手。"
---

我们团队曾经有一个 `DeepRequired`，它能把任何嵌套对象的所有属性变成必填。写出来大概四十行递归条件类型，看起来很优雅。

后来它被删掉了。原因是：它让 `tsc` 的编译时间从 8 秒变成 34 秒，而且几乎每次报错都指向它自己，而不是调用方。

## 一张隐形的账单

我做过一个小实验，同一个业务对象，三种写法：

```ts
// A：直接写类型
interface ConfigA {
  retry: number;
  endpoints: { name: string; url: string }[];
}

// B：从常量推导
const config = {
  retry: 3,
  endpoints: [{ name: "search", url: "/api/search" }]
} as const;
type ConfigB = typeof config;

// C：递归映射 + 条件分发
type DeepReadonly<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;
type ConfigC = DeepReadonly<ConfigA>;
```

在 60 个文件引用这个类型时，`tsc --extendedDiagnostics` 给出的数字差异相当大：

| 方案 | 类型检查耗时 | 报错可读性 | 新人理解成本 |
| --- | --- | --- | --- |
| A 手写 | 基线 | 好 | 无 |
| B 推导 | +6% | 中 | 低 |
| C 递归 | +310% | 差 | 高 |

真正的问题不是那 310%，而是**报错**。当 C 出错时，错误信息会展开成十几行 `Type instantiation is excessively deep` 或者一大坨映射类型，调用方根本不知道自己写错了什么。

## 类型是给人读的，不只是给编译器读的

这是我目前最相信的一条判断：

> 类型的第一个消费者是下一个读代码的人，第二个才是编译器。

所以我会问自己三个问题，任何一个答「否」就放弃花哨的写法：

1. **它是否防止了一类真实发生过的 bug？** 而不是「理论上可能」的 bug。
2. **报错信息是否能让调用方看懂？** 如果只能靠作者解释，那这个类型就是不可维护的。
3. **它的复杂度是否被复用了三次以上？** 只用一次的高级类型，几乎一定是负资产。

## 我更常用的三种「够用的复杂」

不是所有类型技巧都该被劝退。下面这几种我一直在用，收益明显而成本很低：

- **字面量联合 + 穷尽检查。** 让 `switch` 漏掉分支时直接编译报错，比任何文档都可靠。
- **`satisfies` 校验常量。** 既保留字面量类型，又能在定义处检查结构，几乎不需要额外的类型定义。
- **模板字面量类型做路由或事件名。** 它们简单、可读，而且报错友好。

```ts
type Route = `/${string}`;
type EventName = `on${Capitalize<"click" | "focus" | "blur">}`;

function on(event: EventName, handler: () => void) {
  /* ... */
}

on("onClick", () => {}); // 好
// on("click", () => {}); // 报错，而且报错信息一眼能看懂
```

## 收手的位置

类型系统的边际收益下降得非常快。当你在第十层条件分发里调试一个 `infer` 时，请诚实地问自己：这个类型是在保护使用者，还是在满足作者？

我的答案是：如果它不能在一句话里解释清楚，那它就该被拆开，或者被删掉。

```ts
// 与其写这个
type Flatten<T> = T extends (infer U)[] ? U : T extends object ? T[keyof T] : never;

// 不如写这个
interface Options {
  timeout: number;
  retries: number;
}
```

后者能表达的东西更少，但所有人都能读懂，而「能读懂」本身就是一种正确性。
