import { businessInfo } from './businessInfo';

// 취소·환불 규정. 전자상거래 등에서의 소비자보호에 관한 법률상 표시 의무를 충족하기 위한
// 구조를 제공한다. 디지털콘텐츠 단건 이용권 기준. 실제 정책 수치는 운영 기준에 맞게 확정할 것.
export function RefundPage() {
  return (
    <section className="legal-page">
      <header className="legal-head">
        <span className="kicker">결제·환불</span>
        <h1>취소·환불 규정</h1>
        <p>최종 개정일: TODO: 2026-00-00</p>
      </header>

      <article className="legal-body">
        <h2>1. 청약철회</h2>
        <p>
          이용자는 유료 이용권 결제 후 관련 법령이 정한 기간 내에 청약철회를 할 수 있습니다. 다만 이용권을 사용하여
          서비스(직무 평가·CV 생성 등)를 이미 제공받은 경우, 디지털콘텐츠의 특성상 해당 사용분에 대하여는 청약철회가
          제한될 수 있습니다.
        </p>

        <h2>2. 환불 기준</h2>
        <ul>
          <li>사용 이력이 전혀 없는 이용권: 결제 취소 또는 전액 환불</li>
          <li>일부 사용한 이용권: 사용분을 제외한 잔여분 기준으로 환불(TODO: 구체 산정 방식 확정)</li>
          <li>유효기간이 경과한 이용권: 환불 대상에서 제외</li>
        </ul>

        <h2>3. 환불 절차</h2>
        <p>
          환불은 고객센터({businessInfo.customerEmail} / {businessInfo.customerPhone})로 요청하실 수 있으며, 회사는
          환불 요건 확인 후 영업일 기준 3~5일 이내에 결제수단으로 환불을 진행합니다. 카드 결제의 경우 카드사 정책에
          따라 실제 환불 반영 시점이 달라질 수 있습니다.
        </p>

        <h2>4. 회사 귀책 사유에 따른 환불</h2>
        <p>
          서비스 장애 등 회사의 귀책 사유로 이용권을 정상적으로 사용하지 못한 경우, 회사는 해당 분에 대하여 전액
          환불하거나 이용 기간을 연장하는 등 적절한 보상을 제공합니다.
        </p>

        <h2>5. 문의</h2>
        <p>
          {businessInfo.companyName} 고객센터<br />
          이메일 {businessInfo.customerEmail} · 전화 {businessInfo.customerPhone}<br />
          운영시간 {businessInfo.customerHours}
        </p>
      </article>
    </section>
  );
}
