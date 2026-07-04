import { courierLabel, trackingUrl, parseShippingAddress, classifyRecipient, COURIERS } from '../couriers'

describe('COURIERS', () => {
  it('5개 택배사, 코드/라벨 존재', () => {
    expect(COURIERS.map((c) => c.code)).toEqual(['cjlogistics', 'epost', 'hanjin', 'lotte', 'logen'])
  })
})

describe('courierLabel', () => {
  it('코드 → 라벨', () => expect(courierLabel('cjlogistics')).toBe('CJ대한통운'))
  it('미지 코드 → 코드 그대로', () => expect(courierLabel('unknown')).toBe('unknown'))
  it('null → 빈 문자열', () => expect(courierLabel(null)).toBe(''))
})

describe('trackingUrl', () => {
  it('정상 → tracker.delivery URL', () =>
    expect(trackingUrl('cjlogistics', '1234567890')).toBe('https://tracker.delivery/#/kr.cjlogistics/1234567890'))
  it('courier 없으면 null', () => expect(trackingUrl(null, '123')).toBeNull())
  it('송장번호 없으면 null', () => expect(trackingUrl('cjlogistics', null)).toBeNull())
})

describe('parseShippingAddress', () => {
  it('(우편번호) 주소 분리', () =>
    expect(parseShippingAddress('(12345) 서울시 강남구 101동 202호')).toEqual({ zonecode: '12345', address: '서울시 강남구 101동 202호' }))
  it('형식 불일치 → zonecode 빈값 + 원문', () =>
    expect(parseShippingAddress('서울시 강남구')).toEqual({ zonecode: '', address: '서울시 강남구' }))
  it('null → 빈값', () => expect(parseShippingAddress(null)).toEqual({ zonecode: '', address: '' }))
})

describe('classifyRecipient', () => {
  const base = { ordererName: '홍길동', ordererPhone: '010-1111-2222', recipientName: '홍길동', recipientPhone: '010-1111-2222' }
  it('완전 일치 → self', () => expect(classifyRecipient(base)).toBe('self'))
  it('이름만 다름 → other', () => expect(classifyRecipient({ ...base, recipientName: '김철수' })).toBe('other'))
  it('연락처만 다름 → other', () => expect(classifyRecipient({ ...base, recipientPhone: '010-9999-8888' })).toBe('other'))
  it('둘 다 다름 → other', () => expect(classifyRecipient({ ...base, recipientName: '김철수', recipientPhone: '010-9999-8888' })).toBe('other'))
  it('하이픈만 다른 동일번호 → self', () =>
    expect(classifyRecipient({ ...base, recipientPhone: '01011112222' })).toBe('self'))
  it('주문자 정보 없음 → unknown', () =>
    expect(classifyRecipient({ ordererName: null, ordererPhone: null, recipientName: '홍길동', recipientPhone: '010-1111-2222' })).toBe('unknown'))
  it('수령인 정보 없음 → unknown', () =>
    expect(classifyRecipient({ ...base, recipientName: null, recipientPhone: null })).toBe('unknown'))
})
