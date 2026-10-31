# 人生ゲーム Online

Vite + Vanilla JavaScript + Supabase Realtime のオンライン人生ゲームMVPです。

## 起動

```bash
npm install
cp .env.example .env
npm run dev
```

Windows PowerShellで `.env.example` をコピーする場合:

```powershell
Copy-Item .env.example .env
```

## Supabase設定

1. Supabaseでプロジェクトを作成
2. `supabase/schema.sql` をSQL Editorで実行
3. Project Settings > API の Project URL と anon key を `.env` に設定
4. Database > Replication / Publications で `game_rooms` と `game_players` のRealtimeを有効化
5. `npm run dev`

Supabase未設定でもローカルのデモモードで1人プレイの動作確認ができます。オンラインルーム機能にはSupabase設定が必要です。

## MVPの機能

- ルーム作成・コード参加（最大6人）
- プレイヤー名・アバター選択
- ロビーで準備完了
- ホストによるゲーム開始
- サイコロ・ターン進行・イベント・資産表示
- Supabase Realtimeによるルーム更新

## 公開前の重要事項

このサンプルのRLSは動作確認を優先した緩い設定です。URLとanon keyは公開されてもよいキーですが、DBの書き込み権限は誰でも利用できる状態です。一般公開前にSupabase Auth、ルーム参加者チェック、ホスト/手番検証をサーバー側（Edge Functions等）に実装し、RLSを厳格化してください。クライアント側の判定だけでは不正操作を防げません。
