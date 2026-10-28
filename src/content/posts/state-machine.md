---
title: "用 180 行实现一个可调试的状态机"
date: 2025-11-18
tags: ["JavaScript", "架构"]
summary: "当状态散落在十几个 if/else 里时，bug 会以「不可能发生的状态」的形式出现。手写一个最小状态机，顺便把时间旅行调试也装上。"
---

一个真实的故事：某个表单页面出现过一次「提交按钮永久置灰」的线上问题。排查了两个小时，最后发现是两个布尔值同时为 `true`——而那个组合，任何人在写代码时都没想过会出现。

问题的根源不是粗心，而是**用多个布尔值描述一个本质上互斥的状态**。

```js
// 看起来没问题，其实有 2⁴ 种组合，其中大部分没有意义
const state = {
  isLoading: false,
  isError: false,
  isSuccess: false,
  isSubmitting: false
};
```

把它换成一个枚举，问题立刻消失一半：

```js
const state = "idle"; // idle | submitting | success | error
```

那天之后，我在遇到「三个以上状态」的地方，都会先画一张状态图，再写状态机。

## 最小实现

状态机不需要库。核心只有三件事：**当前状态**、**事件到下一个状态的映射**、**状态变化时的通知**。

```js
function createMachine(config) {
  let state = config.initial;
  const listeners = new Set();
  const history = [state];

  function send(event) {
    const handlers = config.states[state];
    if (!handlers) throw new Error("未知状态: " + state);

    const handler = handlers[event.type];
    const next = typeof handler === "function" ? handler(event, state) : handler;
    if (!next || next === state) return state;

    if (!config.states[next]) {
      throw new Error("转移到了未声明的状态: " + next);
    }

    history.push(next);
    state = next;
    listeners.forEach(function (fn) {
      fn(state, event);
    });
    return state;
  }

  function subscribe(fn) {
    listeners.add(fn);
    return function () {
      listeners.delete(fn);
    };
  }

  return {
    send: send,
    subscribe: subscribe,
    get state() {
      return state;
    },
    get history() {
      return history.slice();
    }
  };
}
```

六十行左右，已经能用。配置长这样：

```js
const formMachine = createMachine({
  initial: "idle",
  states: {
    idle: { SUBMIT: "submitting" },
    submitting: { RESOLVE: "success", REJECT: "error" },
    success: { RESET: "idle" },
    error: { SUBMIT: "submitting", RESET: "idle" }
  }
});
```

注意 `submitting` 状态里没有 `SUBMIT` 事件，所以重复点击不会产生任何转移——不必再写 `if (isSubmitting) return`。

## 让它可以被看见

状态机的第二个好处，是渲染层可以变得很笨：

```js
formMachine.subscribe(function (state) {
  render(state); // 一个 switch，仅此而已
});
```

第三个好处是调试。因为我们记了 `history`，时间旅行几乎是免费的：

```js
function replay(machine, events) {
  events.forEach(function (event) {
    machine.send(event);
  });
  return machine.state;
}
```

把用户的操作序列存下来，线上出问题时，可以在本地一字不差地重放一遍。比起在一堆 `console.log` 里猜，这大概快十倍。

## 什么时候不该用

状态机不是银弹。我给自己的判断线是：

- 只有两个状态、一个开关：用布尔值，别过度设计；
- 状态之间没有回边（不会退回）：线性流程，用步骤数组更直观；
- 状态超过十二个：该考虑拆分，而不是继续往一张表里塞。

> 状态机解决的是「状态组合爆炸」，不是「代码组织问题」。状态数量很少时，它带来的只是额外的间接层。

## 一个不那么显然的收益

写状态机的时候，你会被迫回答一个问题：**这个产品到底有几个状态？**

这个问题的答案，往往比对代码的改造更有价值。做上面那个表单时我发现，产品经理嘴里的「提交中」和「等待服务端确认」其实是两个状态，它们对用户的意义完全不同。

页面上的一个 bug，最后变成了产品理解上的一个改进。这大概是抽象最好的样子。
