# Test Cases

## Medium Auto Scroll

### Test Case 1: Direct Medium Article
- **URL**: [https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b](https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b)
- **Expected Behavior**:
  - Page automatically scrolls to bottom
  - Then scrolls back to top after 100ms delay
  - This triggers Medium to load full article content

### Test Case 2: Medium Global Identity Redirect
- **Original URL**: [https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950](https://medium.com/m/global-identity-2?redirectUrl=https%3A%2F%2Fuxdesign.cc%2Ffear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950)
- **Redirected URL**: [https://uxdesign.cc/fear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950](https://uxdesign.cc/fear-of-missing-out-on-ai-is-overshadowing-the-fear-of-losing-our-humanity-d628aacfb950)
- **Expected Behavior**:
  - When visiting the Medium redirect URL, script marks the session
  - After redirect to target site (uxdesign.cc), auto-scroll is triggered
  - Auto-scroll behavior same as direct Medium articles
  - Only works if redirected from Medium's global-identity-2

## Fix Floating Elements

### Test Case: What is Intelligence? Chapter 2
- **URL**: [https://whatisintelligence.antikythera.org/chapter-02/](https://whatisintelligence.antikythera.org/chapter-02/)
- **Expected Behavior**:
  - Navigation bars and progress indicators that originally stayed fixed now scroll away with the page
  - Reading content is never covered by overlays while scrolling
  - Newly injected floating widgets are also converted within one frame thanks to mutation observers
