import type { Page } from '../types';
import { businessInfo, ftcLookupUrl } from '../legal/businessInfo';

interface FooterProps {
  setPage: (page: Page) => void;
}

// 전 페이지 공통 푸터. 전자상거래법상 사업자 정보를 초기 화면에서 쉽게 확인할 수 있도록
// 모든 페이지 하단에 노출한다. 약관/개인정보/환불 페이지 링크도 포함한다.
export function Footer({ setPage }: FooterProps) {
  return (
    <footer className="site-footer">
      <nav className="footer-links" aria-label="정책 및 약관">
        <button onClick={() => setPage('terms')}>이용약관</button>
        <button onClick={() => setPage('privacy')}>개인정보처리방침</button>
        <button onClick={() => setPage('refund')}>취소·환불 규정</button>
        <button onClick={() => setPage('pricing')}>이용권 안내</button>
      </nav>

      <dl className="footer-business">
        <div><dt>상호</dt><dd>{businessInfo.companyName}</dd></div>
        <div><dt>대표자</dt><dd>{businessInfo.representative}</dd></div>
        <div>
          <dt>사업자등록번호</dt>
          <dd>
            {businessInfo.businessRegistrationNumber}
            {' · '}
            <a href={ftcLookupUrl(businessInfo.businessRegistrationNumber)} target="_blank" rel="noopener noreferrer">
              사업자정보확인
            </a>
          </dd>
        </div>
        <div><dt>통신판매업신고</dt><dd>{businessInfo.mailOrderSalesNumber}</dd></div>
        <div><dt>주소</dt><dd>{businessInfo.address}</dd></div>
        <div><dt>고객센터</dt><dd>{businessInfo.customerPhone} · {businessInfo.customerEmail}</dd></div>
        <div><dt>운영시간</dt><dd>{businessInfo.customerHours}</dd></div>
      </dl>

      <p className="footer-copyright">© {new Date().getFullYear()} {businessInfo.companyName}. All rights reserved.</p>
    </footer>
  );
}
