# Phase 3 Kickoff Instructions

**Status:** Phase 2.Mín ✅ Complete, live on Vercel  
**Date:** 2026-08-01  
**Next:** Phase 3 (Adaptive Workout Experience)

---

## What's Ready

- ✅ **Design Spec:** `docs/superpowers/specs/2026-08-01-comar-fit-phase3-design.md`
  - 4 features: Form references, difficulty feedback, progression, rest timers
  - Data models, UI flows, implementation approaches

- ✅ **Implementation Plan:** `docs/superpowers/plans/2026-08-01-comar-fit-phase3.md`
  - 14 tasks in 3 phases (6 weeks)
  - Effort estimates, dependencies, milestones
  - Testing strategy

- ✅ **Main Branch:** Clean, all tests pass (204/206)
- ✅ **Vercel:** Auto-deploying on push to main

---

## Your Task: Phase 3.1 Kickoff

**Convert Phase 3.1 Plan to TDD Format + Execute**

1. **Read the docs:**
   - `docs/superpowers/specs/2026-08-01-comar-fit-phase3-design.md` (features overview)
   - `docs/superpowers/plans/2026-08-01-comar-fit-phase3.md` (Phase 3.1 tasks 1-5)

2. **Create detailed TDD plan for Phase 3.1:**
   - Rewrite Tasks 1-5 (Form References + Difficulty Feedback) in bite-sized TDD format
   - Example format: `docs/superpowers/plans/2026-08-XX-phase3.1-tdd.md`
   - Follow the format from Phase 2: test-first, small commits, clear dependencies

3. **Execute via Subagent-Driven Development:**
   - Create worktree: `feature/phase3-adaptive-workout`
   - Use same SDD workflow as Phase 2
   - Each task = one focused commit with tests

4. **Phase 3.1 Tasks (in order):**
   - Task 1: Exercise form reference data structure + catalog
   - Task 2: Form reference modal component
   - Task 3: Difficulty rating UI
   - Task 4: Firestore schema update
   - Task 5: E2E tests

5. **Merge to main:**
   - After all 5 tasks pass review
   - Tests run against emulator
   - Push to main → Vercel auto-deploys

---

## Key Numbers

- **Effort:** ~10-15 days (2 weeks for Phase 3.1)
- **Tests:** Target >95% coverage
- **E2E:** Run against Firestore emulator before merge
- **Vercel:** Should auto-deploy on push

---

## Reference

- **Baseline:** Phase 2.Mín commit `2906e33` (form integration complete)
- **App:** Live at https://comar-fit.vercel.app (or your Vercel URL)
- **Codebase:** `/comar-fit-publish/app/src/`

---

## Questions?

Refer to:
- Phase 3 design for feature details
- Phase 3 plan for task breakdown
- Phase 2.Mín execution for SDD workflow

**Go build! 🚀**
