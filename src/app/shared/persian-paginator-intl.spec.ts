import { TestBed } from '@angular/core/testing';

import { PersianPaginatorIntl } from './persian-paginator-intl';

describe('PersianPaginatorIntl', () => {
  let service: PersianPaginatorIntl;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PersianPaginatorIntl);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
