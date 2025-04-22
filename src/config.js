export const config = {
  tweetSelector: 'article[data-testid="tweet"]',
  usernameSelector:
    '[data-testid="User-Name"] :nth-child(2) a[href^="/"][role="link"] span',
  avatarSelector: 'div[data-testid="Tweet-User-Avatar"]',
};

export default config;
