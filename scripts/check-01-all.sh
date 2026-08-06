#!/bin/bash
# 01단계 전체 검증 실행 스크립트

set -euo pipefail

printf '%s\n' '==================================================' '01단계 전체 검증 시작' '=================================================='

printf '%s\n' '[1/8] canonical DB schema 검증...'
npm run check:user-template-ui:schema

printf '%s\n' '[2/8] 사용자 템플릿 DB/API 기준선 + fixture 검증...'
npm run check:user-template-ui:baseline

printf '%s\n' '[3/8] TypeScript 타입 체크...'
npx tsc --noEmit

printf '%s\n' '[4/8] template entitlement 검증...'
npm run check:template-entitlement

printf '%s\n' '[5/8] Template Studio runtime 검증...'
npm run check:template-studio:runtime

printf '%s\n' '[6/8] Thumbnail Studio runtime/integration 검증...'
npm run check:thumbnail-studio:runtime
npm run check:thumbnail-studio:integration

printf '%s\n' '[7/8] 구매 plan-template 및 승인 경계 검증...'
npm run check:purchase-plan-validation

printf '%s\n' '[8/8] Supabase key boundary 검증...'
npm run check:supabase-key-boundary

printf '%s\n' '==================================================' '01단계 검증 통과' '=================================================='
