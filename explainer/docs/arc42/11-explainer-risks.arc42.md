# Risks and Technical Debt

The explainer's risks, besides the generic ones.

## The Skill Says the Explainer Stores Nothing

The skill `lernapps-explainer` says the explainer stores nothing, while the client module keeps the learner's chosen
way to the tutor, and the choice to load videos directly, on the device through the storage wrapper; an entry written from the skill may declare no storage.

```arc42
:::ignore H007 a sentence to correct in the skill lernapps-explainer, not a matter for an architecture decision
:::
:::risk
id: risk-explainer-storage-doc
title: The skill and the runtime differ on what the explainer stores
severity: low
mitigation: Correct the sentence in the skill (the tutor choice and the video choice are kept on the device).
:::
```

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
