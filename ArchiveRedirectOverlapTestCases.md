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

## 固定快照查詢結果

- **1**：[404 Media — HN 留言提供的快照](https://archive.ph/wy1Wt)。來源：[HN 討論](https://news.ycombinator.com/item?id=43045835)。
- **9**：[The Atlantic — 公開引用的快照](https://archive.is/20250108154250/https://www.theatlantic.com/magazine/archive/2025/02/american-loneliness-personality-politics/681091)。來源：[外部文章引用](https://om.co/2025/05/17/what-an-unusual-week/)。
- **11**：[WSJ — 使用者實測最終網址](https://archive.is/T0atg)。目前無法從外部獨立讀取 Archive Today 頁面，採用使用者提供的網址。
- **2、3、4、5、6、7、8、10**：已搜尋，但未找到足以確認原始文章和固定快照 URL 對應的資料，保留 `/submit/?url=<encoded URL>`。

固定快照不保證免除 CAPTCHA；快照代表當時的歷史版本，非原站最新內容。原始標題來自原文網站，而非封存網域。

## 動態最新快照路徑（尚未改為預設）

Archive Today 另有社群與擴充功能使用的 `https://archive.is/newest/<原始網址>` 端點，服務會嘗試尋找**最新已存在的快照**，並導向像 `https://archive.is/T0atg` 的固定網址。參考：

- https://github.com/jackar/archive_viewer
- https://chromewebstore.google.com/detail/archivetoday-automator/mmhadhnchpgicjlmlcdfaapkekknnkha

它不等於 `/submit/?url=`：未找到既有快照時，可能顯示建立快照頁或其他錯誤。第三方工具也提醒可能遇到 CAPTCHA 或服務限流。由於**未能從目前環境連線驗證原始 8 篇的 /newest 回應**，暫不把它無條件取代正式 fallback；保留既定 `/submit/` 行為，並只對三筆已知文章使用固定快照直連。
