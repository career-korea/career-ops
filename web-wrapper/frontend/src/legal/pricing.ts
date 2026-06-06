// 단건 이용권(크레딧) 상품 정의. 결제 가맹 심사 시 가격·제공내용·환불조건이
// 노출되어야 하므로 여기서 단일 관리한다. 실제 가격/구성으로 교체할 것.
// 단건 결제 모델(정기구독 아님)이며, 가격은 원(KRW), VAT 포함 여부를 명시한다.

export interface PricingTier {
  id: string;
  name: string; // 상품명
  priceKrw: number; // 판매가(원, VAT 포함)
  vatIncluded: boolean;
  description: string; // 제공 내용
  features: string[]; // 세부 제공 항목
  validityDays: number; // 이용권 유효기간(일)
  highlighted?: boolean; // 추천 표시
}

export const pricingTiers: PricingTier[] = [
  {
    id: 'starter',
    name: 'TODO: 스타터 이용권',
    priceKrw: 9900,
    vatIncluded: true,
    description: 'TODO: 직무 평가 N회 / CV 생성 N회',
    features: ['TODO: 직무 평가 10회', 'TODO: CV PDF 생성 5회', 'TODO: 포털 스캔 포함'],
    validityDays: 30,
  },
  {
    id: 'pro',
    name: 'TODO: 프로 이용권',
    priceKrw: 29900,
    vatIncluded: true,
    description: 'TODO: 직무 평가 N회 / CV 생성 N회',
    features: ['TODO: 직무 평가 50회', 'TODO: CV PDF 생성 30회', 'TODO: 우선 처리'],
    validityDays: 90,
    highlighted: true,
  },
];

export function formatKrw(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}
