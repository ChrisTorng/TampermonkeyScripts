# Archive Today / Internet Archive 重疊網站：11 項手動測試

> 建立日期：2026-11-05。僅提供原始網站的文章網址；**11 項實測全為 a；已排除來源腳本重疊**。

## 測試方法

1. 在 Tampermonkey **同時啟用** `InternetArchive.user.js` 與 `ArchiveToday.user.js`（請更新為修正後版本）。
2. 依序點每一個**原始網站連結**，建議在全新分頁開啟；觀察自動重導向**最後停留的網域**（不是中途經過的網站）。
3. 記錄結果：`I` = 最終 `web.archive.org`；`a` = 最終 `archive.is` 或 `archive.ph`；`X` = 其他情況，請補充實際網址或錯誤。就算頁面需要付費／驗證，只要網址已導向其中一站，仍以該站為準。
4. 直接在 ChatGPT 回覆 `1I 2a 3I ...`，未測試項目可略過。取得結果後才調整來源兩個衝突腳本及 `blog-bookmarks` 的規則。

## 11 個原始文章網址

1. **404 Media**（`www.404media.co`）  
   [開啟原始網站文章](https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/)  
   `https://www.404media.co/anyone-can-push-updates-to-the-doge-gov-website-2/`  
   來源：現有 TestCases.md。實測：`a`

2. **Bloomberg**（`www.bloomberg.com`）  
   [開啟原始網站文章](https://www.bloomberg.com/news/articles/2025-11-25/three-years-of-ai-mania-how-chatgpt-reordered-the-stock-market)  
   `https://www.bloomberg.com/news/articles/2025-11-25/three-years-of-ai-mania-how-chatgpt-reordered-the-stock-market`  
   來源：新增，已搜尋核對 Bloomberg 文章頁。實測：`a`

3. **The Economist**（`www.economist.com`）  
   [開啟原始網站文章](https://www.economist.com/interactive/christmas-specials/2024/12/21/the-chart-of-everything)  
   `https://www.economist.com/interactive/christmas-specials/2024/12/21/the-chart-of-everything`  
   來源：現有 TestCases.md；可能遇到反機器人驗證。實測：`a`

4. **Financial Times**（`www.ft.com`）  
   [開啟原始網站文章](https://www.ft.com/content/a3eeb268-5daa-4525-858b-eab93b28d3c7)  
   `https://www.ft.com/content/a3eeb268-5daa-4525-858b-eab93b28d3c7`  
   來源：現有 TestCases.md；可能需要訂閱。實測：`a`

5. **Nature**（`www.nature.com`）  
   [開啟原始網站文章](https://www.nature.com/articles/d41586-025-00648-5)  
   `https://www.nature.com/articles/d41586-025-00648-5`  
   來源：現有 TestCases.md。實測：`a`

6. **New Scientist**（`www.newscientist.com`）  
   [開啟原始網站文章](https://www.newscientist.com/article/2458385-ai-uses-throat-vibrations-to-work-out-what-someone-is-trying-to-say/)  
   `https://www.newscientist.com/article/2458385-ai-uses-throat-vibrations-to-work-out-what-someone-is-trying-to-say/`  
   來源：現有 TestCases.md；可能需要訂閱。實測：`a`

7. **The New Yorker**（`www.newyorker.com`）  
   [開啟原始網站文章](https://www.newyorker.com/magazine/2025/02/17/the-long-flight-to-teach-an-endangered-ibis-species-to-migrate)  
   `https://www.newyorker.com/magazine/2025/02/17/the-long-flight-to-teach-an-endangered-ibis-species-to-migrate`  
   來源：現有 TestCases.md；可能需要訂閱。實測：`a`

8. **The New York Times**（`www.nytimes.com`）  
   [開啟原始網站文章](https://www.nytimes.com/2024/12/23/health/mpox-spread-congo-kinshasa.html)  
   `https://www.nytimes.com/2024/12/23/health/mpox-spread-congo-kinshasa.html`  
   來源：現有 TestCases.md；可能遇到反機器人驗證。實測：`a`

9. **The Atlantic**（`www.theatlantic.com`）  
   [開啟原始網站文章](https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/)  
   `https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091/`  
   來源：現有 TestCases.md。實測：`a`

10. **WIRED**（`www.wired.com`）  
   [開啟原始網站文章](https://www.wired.com/story/elon-musk-government-young-engineers/)  
   `https://www.wired.com/story/elon-musk-government-young-engineers/`  
   來源：現有 TestCases.md；可能需要訂閱。實測：`a`

11. **The Wall Street Journal**（`www.wsj.com`）  
   [開啟原始網站文章](https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c)  
   `https://www.wsj.com/world/dozens-feared-dead-in-crash-after-passenger-flight-diverts-from-russia-fb2cdf2c`  
   來源：現有 TestCases.md；可能遇到反機器人驗證。實測：`a`

## 填答範例

```text
1I 2a 3I 4a 5I 6I 7a 8I 9a 10I 11a
```

若兩個腳本在同一網址連續重導，可回報 `3X 最終網址：https://...`，或補充觀察到的順序。這份清單驗證的是**你目前瀏覽器實際執行結果**，而非單靠程式推導優先順序。

## 原始標題的儲存原則

- `title_original` 必須來自**原始文章網站**的 HTML 標題／Metadata，不能取自 Internet Archive、Archive Today 或其他重導向頁面的標題。
- `title_zh` 使用實際取得的繁體中文翻譯，中文為主，原文為輔。無法取得時保持空值，不推測。
- `url` 保存原始網址，`redirect_url` 保存優先或觀察到的轉址網址，不能互相覆寫。

## 統一轉址規則

11 項實測都到 Archive Today；原始網域由 `ArchiveToday.user.js` 處理，並統一前往 `https://archive.is/submit/?url=<URL 編碼後的原始網址>`。

**不建立任何單篇文章的固定快照對應**。之後實際跳往哪個快照或是否進行人機驗證，交由 Archive Today 決定。腳本在 `document-start` 執行，以減少原始頁面閃現。
