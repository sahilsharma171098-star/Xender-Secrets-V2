#!/usr/bin/env bash
# Deletes the 54 Xender-Secrets-V2 branches whose PRs are merged and whose tip is exactly the merged
# PR head (checked 4 Nov 2026). Cloudflare then auto-deletes their empty previews, freeing Durable
# Object slots. Skipped on purpose: main, backup/*, branches with open PRs or no PR, closed-unmerged
# PRs, and feat/payu-gateway-foundation-20261102 (has commits after its merge).
# Run from any clone of the repo:  bash delete-merged-branches.sh
set -e
git push origin --delete \
  ai-collaboration-setup \
  automation/facebook-novel-traffic-20261010 \
  chatgpt/gsc-audit-fixes-20261007 \
  chatgpt/razorpay-gateway-20261008 \
  chatgpt/xend-agent-reach-001 \
  chatgpt/xend-catalog-immersive-001 \
  chatgpt/xend-catalog-immersive-release-notes-20261024 \
  chatgpt/xend-execution-checkpoint-20261014 \
  chatgpt/xend-extension-revenue-funnel-20261102 \
  chatgpt/xend-growth-20261014 \
  claude/acq-002-maps-prospects \
  claude/acq-003-score-sweet-spot \
  claude/ext-001-sitecheck \
  claude/instagram-from-autotube \
  claude/project-thread-5ar4i7 \
  claude/qa-fixes \
  claude/sitecheck-payu-recovery-20261103 \
  claude/xend-dev-002-commercial-pages \
  claude/xend-gsc-indexing-001 \
  claude/xend-hq-01-audit-fixes \
  claude/xend-hq-01-integration \
  claude/xend-hud-site-001 \
  claude/xend-sales-002-preview-system \
  claude/xend-seo-traffic-001 \
  claude/xend-showcase-rebuild \
  claude/xend-warroom-001-revenue-engine \
  claude/xend-yt-course-001 \
  claude/xend-yt-course-english \
  claude/xend-yt-course-videos \
  claude/youtube-format-shared \
  codex/gemini-shared-hq-20261022 \
  codex/google-ai-workspace-20261022 \
  codex/hq-review-fixes-20261024 \
  codex/nvidia-grok-hq-20261022 \
  codex/shared-build-home-20261022 \
  codex/shared-task-workspace-20261024 \
  codex/workstation-health-record-20261024 \
  codex/youtube-instagram-crosspost-20261024 \
  feat/client-portfolio-scroll-motion-20261008 \
  feat/google-analytics-ga4 \
  feat/sitecheck-owner-only-payment-pilot-20261102 \
  feat/sitecheck-pro-baselines-20261102 \
  fix/google-oauth-workspace-credentials-20261104 \
  fix/novel-default-english \
  fix/sitecheck-prod-freshness-gate-20261102 \
  fix/windows-dev-env-p0 \
  fix/windows-local-dev-p1 \
  reader-static-edge \
  research/xend-loot-001-microproducts \
  xend-acq-001-site-quality \
  xend-claude-full-project-handoff \
  xend-monetization-001-ads \
  xend-msme-trust-badge \
  xend-sales-003-brand-personalization

# Undo any one of them (commit stays on GitHub via its PR), or use "Restore branch" on the PR page:
#   git push origin 251b157e0d5c842142c45035a8d133a7964f8205:refs/heads/ai-collaboration-setup   # PR #1
#   git push origin c8c7def116cc5f7d8383bf420033fc0b5263822f:refs/heads/automation/facebook-novel-traffic-20261010   # PR #49
#   git push origin 803b66a1f6bda724dbceb52796eab2b02478f66f:refs/heads/chatgpt/gsc-audit-fixes-20261007   # PR #37
#   git push origin 80b6a7fc51a741060aac2efbd7a62c90c1fe5a26:refs/heads/chatgpt/razorpay-gateway-20261008   # PR #38
#   git push origin b59a71ac23d7e6fcdd63470a84c66b2725bd3dd6:refs/heads/chatgpt/xend-agent-reach-001   # PR #54
#   git push origin 156eb039f4863386c6023e782fbc6eab88444785:refs/heads/chatgpt/xend-catalog-immersive-001   # PR #77
#   git push origin 2a0e8a66c7c863cc02d066ea86ce0bc7c9ccc143:refs/heads/chatgpt/xend-catalog-immersive-release-notes-20261024   # PR #78
#   git push origin 1f2c4d7063d6c67d0f0cecd724e173dd497073c7:refs/heads/chatgpt/xend-execution-checkpoint-20261014   # PR #56
#   git push origin 2bd1c444c78db93aa7a709b6959481a388a1a58b:refs/heads/chatgpt/xend-extension-revenue-funnel-20261102   # PR #89
#   git push origin c8f2a29bdcd38dc159324dfc0ee54a482a52d995:refs/heads/chatgpt/xend-growth-20261014   # PR #55
#   git push origin efd7432019c4dca82755437383a95b87aed1ec55:refs/heads/claude/acq-002-maps-prospects   # PR #50
#   git push origin fc0ec249824f822b10038fbc894b70ef3407fe86:refs/heads/claude/acq-003-score-sweet-spot   # PR #51
#   git push origin 6c1a3c68a2d422926ca74d065d915d1faa8a0bd3:refs/heads/claude/ext-001-sitecheck   # PR #28
#   git push origin d32df26f7cf65910878a8471c056823a27b4e710:refs/heads/claude/instagram-from-autotube   # PR #82
#   git push origin df11185683d66cc2d78b4a8bf7c05c8fb8811b2c:refs/heads/claude/project-thread-5ar4i7   # PR #40
#   git push origin 9051478e30c02b1e77b649b555129b71ad000a7b:refs/heads/claude/qa-fixes   # PR #30
#   git push origin 708e87657b5ce90838fd7dee2e5a90e9a8b4443b:refs/heads/claude/sitecheck-payu-recovery-20261103   # PR #99
#   git push origin e177b8c283c324fb94b23a1d394d0c9245aa1631:refs/heads/claude/xend-dev-002-commercial-pages   # PR #20
#   git push origin a386d7d0c6c57a3997a4ec48a24fdd1ad4aa2ed2:refs/heads/claude/xend-gsc-indexing-001   # PR #36
#   git push origin f54a5a9d3b6a57e11b5ca5f9494d66a8fde4b58d:refs/heads/claude/xend-hq-01-audit-fixes   # PR #65
#   git push origin 325633d7e530881aa8734dd575f10655aedffa3c:refs/heads/claude/xend-hq-01-integration   # PR #63
#   git push origin a93bac5e3c3534f9e3083c9dba9cff2d77446af1:refs/heads/claude/xend-hud-site-001   # PR #84
#   git push origin 6c361ae4b75681284e214af91304e81fe26f79ed:refs/heads/claude/xend-sales-002-preview-system   # PR #21
#   git push origin 01ab428cb03f0da35caeed0ea30fb318180c9909:refs/heads/claude/xend-seo-traffic-001   # PR #33
#   git push origin d2fb4290b211cc3ed7ce1ef8c984c89ad063347f:refs/heads/claude/xend-showcase-rebuild   # PR #48
#   git push origin ea599d7812aaebb1bc367ae7d03d14a32ae82f05:refs/heads/claude/xend-warroom-001-revenue-engine   # PR #18
#   git push origin df8758236c0a6e836b33cd038e309e197747ee66:refs/heads/claude/xend-yt-course-001   # PR #60
#   git push origin fffa411d7226f940b214977a0f70b75e9d44ca4d:refs/heads/claude/xend-yt-course-english   # PR #61
#   git push origin 85e96248a67ff89f992246ab7726fefe362ab8a0:refs/heads/claude/xend-yt-course-videos   # PR #62
#   git push origin de40f84f1acf02d219b696d1fd29dd5e9a8bf16d:refs/heads/claude/youtube-format-shared   # PR #80
#   git push origin aaae32f10ed5cd84be3479ca5e3d634737fb77ee:refs/heads/codex/gemini-shared-hq-20261022   # PR #67
#   git push origin c3608ad90c9a76dd9c1292ed49a1e461e3d086fe:refs/heads/codex/google-ai-workspace-20261022   # PR #68
#   git push origin 9a81b513618c267306c2b2e8752cf4f84892b510:refs/heads/codex/hq-review-fixes-20261024   # PR #70
#   git push origin d9066e291d743f6840fb733949206f6ce9ed0585:refs/heads/codex/nvidia-grok-hq-20261022   # PR #69
#   git push origin 393b0a8e131467a260d88b00e868087ea60969b5:refs/heads/codex/shared-build-home-20261022   # PR #66
#   git push origin 9c7949cd0091dfc6543fddb395484739a0649ca0:refs/heads/codex/shared-task-workspace-20261024   # PR #75
#   git push origin 63dacc8c6417e6afac8bce94614bd52c82a93a90:refs/heads/codex/workstation-health-record-20261024   # PR #74
#   git push origin 9e556151ea0f275715ed686d5f56a0507c75f9d3:refs/heads/codex/youtube-instagram-crosspost-20261024   # PR #76
#   git push origin 5aefbc338a37b806ca3ccd89a04002d24d7d81e2:refs/heads/feat/client-portfolio-scroll-motion-20261008   # PR #39
#   git push origin 282be35faac52aebeaa9391426daa12f1406cc5d:refs/heads/feat/google-analytics-ga4   # PR #101
#   git push origin df2dd49041607a395f6a0e5375abd880bd521c66:refs/heads/feat/sitecheck-owner-only-payment-pilot-20261102   # PR #98
#   git push origin c01e9e37f3785d25f3de402cef602fa2e94701b3:refs/heads/feat/sitecheck-pro-baselines-20261102   # PR #95
#   git push origin 68a0d228e92391b50b5a5656be44e3184e154e0c:refs/heads/fix/google-oauth-workspace-credentials-20261104   # PR #103
#   git push origin dcbd73472c1239951fceccdd870e56a3695ba71d:refs/heads/fix/novel-default-english   # PR #26
#   git push origin 47df2e85fd65fbb0fd8ee51e3804b1ae35f42cd6:refs/heads/fix/sitecheck-prod-freshness-gate-20261102   # PR #97
#   git push origin ec50d1d2f7a505c338a2229e35a145d2d7a1e0e6:refs/heads/fix/windows-dev-env-p0   # PR #42
#   git push origin 1383bd612985a2b7c7274d7f86e99773a8204f04:refs/heads/fix/windows-local-dev-p1   # PR #45
#   git push origin 9ee7ff510f9aef686d83ae6312e03505a17f1e87:refs/heads/reader-static-edge   # PR #16
#   git push origin 0ccbe7b1248092d542c980c1aedc16960c151a63:refs/heads/research/xend-loot-001-microproducts   # PR #53
#   git push origin 3b12c5774c9a29bfe72ae8a47bbc697470325f2a:refs/heads/xend-acq-001-site-quality   # PR #14
#   git push origin 11662bd9bd69e3cc01dbe8557ab2c5c63f16c8c8:refs/heads/xend-claude-full-project-handoff   # PR #17
#   git push origin 1a5c0bac76a7f315520dfc8ac0866efac862ddbb:refs/heads/xend-monetization-001-ads   # PR #34
#   git push origin f50d5a1da928ef08e55130d05711167faadc09c6:refs/heads/xend-msme-trust-badge   # PR #35
#   git push origin 6e641c56b4cf4cac0340c2bf7972ae890b1ced6e:refs/heads/xend-sales-003-brand-personalization   # PR #32
