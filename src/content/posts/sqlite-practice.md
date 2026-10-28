---
title: "我用 SQLite 做个人项目的数据层"
date: 2025-08-13
tags: ["SQLite", "后端"]
summary: "一个只有几百个用户的单机项目，从「要不要上 Postgres」到「SQLite 加 WAL 就够了」。附全文检索、迁移与备份的实际写法。"
---

做一个小产品时，数据库选型往往比想象中更容易被过度设计。我的项目日活不到三百，读写比大概 9:1，跑在一台 2 核 4G 的机器上。

最初我上了 Postgres，理由是「以后可能会扩展」。半年后我把它换成了 SQLite，理由是：**以后大概不会扩展，而我现在每天都在为运维付利息**。

## 为什么够用

SQLite 常被认为「玩具」，这完全是误解。它的实际边界很清楚：

- **单机写入是串行的。** WAL 模式下读写可以并发，但写入仍然一次一个。
- **没有网络协议。** 进程内直接读文件，省掉了序列化和连接池。
- **事务是真事务。** 崩溃安全、ACID，比很多「轻量方案」强。

对一个写少读多、单机部署、数据量几十 GB 以内的项目来说，这些限制都不是问题。而我换来的收益是：

- 备份 = 复制一个文件；
- 迁移环境 = 复制一个文件；
- 本地开发 = 不需要起服务；
- 冷启动 = 毫秒级。

## 四条 PRAGMA

开库之后第一件事，是把这几个开关打开。它们决定了默认行为是否适合服务端场景。

```sql
PRAGMA journal_mode = WAL;      -- 读写并发
PRAGMA synchronous = NORMAL;    -- WAL 下的推荐值
PRAGMA foreign_keys = ON;       -- 默认是关的，必须显式打开
PRAGMA busy_timeout = 5000;     -- 写冲突时等待而不是立刻报错
```

`synchronous = NORMAL` 是我唯一需要动脑的地方：它意味着断电时可能丢失最后几个事务，但不会损坏数据库。对个人项目，这个权衡很合理。

## 全文检索

SQLite 自带 FTS5。中文需要显式指定分词器，否则按空白切分几乎什么都搜不到：

```sql
CREATE VIRTUAL TABLE notes_fts USING fts5(
  title,
  body,
  content = 'notes',
  content_rowid = 'id',
  tokenize = 'trigram'
);
```

`trigram` 是 SQLite 3.34 之后内置的，不需要编译扩展，对中文足够好用。查询时用 `MATCH`：

```sql
SELECT notes.*
FROM notes
JOIN notes_fts ON notes_fts.rowid = notes.id
WHERE notes_fts MATCH ?
ORDER BY rank
LIMIT 20;
```

触发器负责同步。注意 FTS5 的外部内容表（`content=`）方案不会自动更新，必须手写：

```sql
CREATE TRIGGER notes_ai AFTER INSERT ON notes BEGIN
  INSERT INTO notes_fts(rowid, title, body)
  VALUES (new.id, new.title, new.body);
END;

CREATE TRIGGER notes_ad AFTER DELETE ON notes BEGIN
  INSERT INTO notes_fts(notes_fts, rowid, title, body)
  VALUES ('delete', old.id, old.title, old.body);
END;
```

`'delete'` 那个特殊行很容易漏，漏了就会出现「已删除的文章还能被搜到」。

## 迁移

不用第三方库，`user_version` 就够：

```sql
PRAGMA user_version;  -- 读当前版本
PRAGMA user_version = 3; -- 写下新版本
```

启动时读版本号，逐个执行未应用的迁移脚本，整个流程包在一个事务里。四十行代码，可读、可回滚、不引依赖。

## 备份

最优雅的备份命令是 `VACUUM INTO`（SQLite 3.27+），它导出一个一致性的快照，并且顺带整理碎片：

```sql
VACUUM INTO '/backups/app-2025-08-13.db';
```

放进 cron，每天一次，配合保留最近三十份。就这么简单。

## 什么时候不该用

我也给自己写下了切换的条件，免得将来靠感觉决策：

- 需要多个写入进程并发（哪怕是「两个 worker」）；
- 需要跨机器读写同一份数据；
- 单表数据量进入十亿行级别，或需要复杂的分析查询；
- 需要数据库层面的权限与审计。

只要有一条命中，就该换成 Postgres。但在那之前，SQLite 让我少运维了大概几百个小时。

> 选型的本质不是「哪个更强」，而是「哪个更配得上你现在的规模」。
