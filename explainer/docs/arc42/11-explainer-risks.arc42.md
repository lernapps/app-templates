# Risks and Technical Debt

The explainer's risks, besides the generic ones.

## YouTube's Player After the Click

Once the player of youtube-nocookie.com loads, YouTube gets the learner's IP address and may keep data in its own
frame; the privacy-enhanced host only defers that until the click. The app cannot limit what the player does.

```arc42
:::risk
id: risk-explainer-video-after-click
severity: low
title: After the click, YouTube's player sends data to Google
mitigation: Nothing loads before the click; the note says what the click sends; the standing choice is the learner's and can be withdrawn; the catalog entry declares thirdParty on-click.
:::
```
