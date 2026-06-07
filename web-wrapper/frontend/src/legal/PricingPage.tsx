import { Check } from 'lucide-react';
import type { Page } from '../types';
import { pricingTiers, formatKrw } from './pricing';

interface PricingPageProps {
  setPage: (page: Page) => void;
}

// 이용권(단건 결제) 가격 안내. 결제 가맹 심사 시 상품명·가격·제공내용·환불조건이
// 공개적으로 노출되어야 한다. 실제 결제 동작은 가맹 승인 후(Phase B) 연결한다.
export function PricingPage({ setPage }: PricingPageProps) {
  return (
    <section className="pricing-page">
      <header className="legal-head">
        <span className="kicker">이용권 안내</span>
        <h1>이용권 구매</h1>
        <p>필요한 만큼 단건으로 구매하는 이용권입니다. 표시 가격은 부가가치세(VAT)를 포함합니다.</p>
      </header>

      <div className="pricing-grid">
        {pricingTiers.map((tier) => (
          <div key={tier.id} className={tier.highlighted ? 'pricing-card highlighted' : 'pricing-card'}>
            {tier.highlighted && <span className="pricing-badge">추천</span>}
            <h2>{tier.name}</h2>
            <div className="pricing-amount">
              <strong>{formatKrw(tier.priceKrw)}</strong>
              <small>{tier.vatIncluded ? 'VAT 포함' : 'VAT 별도'}</small>
            </div>
            <p className="pricing-desc">{tier.description}</p>
            <ul className="pricing-features">
              {tier.features.map((feature) => (
                <li key={feature}>
                  <Check size={15} /> {feature}
                </li>
              ))}
            </ul>
            <p className="pricing-validity">유효기간: 구매일로부터 {tier.validityDays}일</p>
            <button className="pricing-buy" disabled title="결제 기능 준비 중">
              결제 준비 중
            </button>
          </div>
        ))}
      </div>

      <p className="pricing-note">
        결제·취소·환불에 관한 자세한 사항은{' '}
        <button className="inline-link" onClick={() => setPage('refund')}>
          취소·환불 규정
        </button>
        을 확인해 주세요.
      </p>
    </section>
  );
}
