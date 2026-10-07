-- ============================================================
-- NOCAU portfolio-site · 个人工作台私有表
-- 表名：public.workbench_items（单表多态：项目状态 / API 余额 / 快捷链接 / 备忘）
-- 执行位置：Supabase Dashboard → SQL Editor → New query → Run
-- 说明：RLS 开启后，仅登录用户本人可读写自己的行（user_id = auth.uid()）
-- 前端：assets/js/workbench-app.js（supabase-js 直连，字段与下方一致）
-- ============================================================

-- 1) 建表
create table if not exists public.workbench_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind       text not null check (kind in ('project', 'balance', 'link', 'note')),
  title      text not null check (length(title) between 1 and 120),
  detail     text not null default '',          -- project: 项目描述 / balance: 备注配额 / link: 说明 / note: 备忘正文
  value      text not null default '',          -- balance: 余额数值 / link: URL / project: 进度或关联链接 / note: 可选标签
  status     text not null default '',          -- project: 进行中/已完成/暂停/搁置 / balance: ok/warn/over
  sort       integer not null default 0,        -- 预留排序位
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2) 索引：按用户 + 模块 + 时间查询
create index if not exists workbench_items_user_kind_idx
  on public.workbench_items (user_id, kind, created_at);

-- 3) 行级安全：仅本人
alter table public.workbench_items enable row level security;

drop policy if exists "workbench_items_select_own" on public.workbench_items;
create policy "workbench_items_select_own"
  on public.workbench_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "workbench_items_insert_own" on public.workbench_items;
create policy "workbench_items_insert_own"
  on public.workbench_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "workbench_items_update_own" on public.workbench_items;
create policy "workbench_items_update_own"
  on public.workbench_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "workbench_items_delete_own" on public.workbench_items;
create policy "workbench_items_delete_own"
  on public.workbench_items
  for delete
  using (auth.uid() = user_id);
