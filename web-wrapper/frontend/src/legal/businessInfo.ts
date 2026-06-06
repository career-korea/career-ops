// 사업자 정보 단일 소스(Single Source of Truth).
// 전자상거래법상 표시 의무 항목 + 결제 가맹(KG이니시스/NHN KCP) 심사용 사업자 정보.
// 실제 값으로 교체하기 전까지는 'TODO:' 플레이스홀더를 유지한다.
// 한 곳에서만 관리하므로 푸터/약관/개인정보처리방침이 모두 같은 값을 참조한다.

export interface BusinessInfo {
  serviceName: string;
  companyName: string; // 상호
  representative: string; // 대표자
  businessRegistrationNumber: string; // 사업자등록번호 (XXX-XX-XXXXX)
  mailOrderSalesNumber: string; // 통신판매업 신고번호
  address: string; // 사업장 주소
  customerPhone: string; // 고객센터 전화
  customerEmail: string; // 고객센터 이메일
  customerHours: string; // 운영시간
  privacyOfficer: string; // 개인정보보호책임자
  hostingProvider: string; // 호스팅 제공자
  siteDomain: string; // 서비스 도메인
}

export const businessInfo: BusinessInfo = {
  serviceName: 'career-ops',
  companyName: 'TODO: 상호(사업자등록증상 상호)',
  representative: 'TODO: 대표자명',
  businessRegistrationNumber: 'TODO: 000-00-00000',
  mailOrderSalesNumber: 'TODO: 통신판매업신고 제2026-지역-00000호',
  address: 'TODO: 사업장 주소',
  customerPhone: 'TODO: 00-0000-0000',
  customerEmail: 'TODO: support@example.com',
  customerHours: '평일 10:00–18:00 (점심 12:00–13:00 제외, 주말·공휴일 휴무)',
  privacyOfficer: 'TODO: 개인정보보호책임자(보통 대표자)',
  hostingProvider: 'Vercel Inc. (프론트엔드) / Railway Corp. (백엔드)',
  siteDomain: 'TODO: https://your-domain.vercel.app',
};

// 공정거래위원회 통신판매사업자 정보 공개 조회.
// 사업자등록번호를 쿼리로 붙이면 해당 사업자 페이지로 바로 연결된다.
export function ftcLookupUrl(brn: string): string {
  const digits = brn.replace(/\D/g, '');
  return `https://www.ftc.go.kr/bizCommPop.do?wrkr_no=${digits}`;
}
