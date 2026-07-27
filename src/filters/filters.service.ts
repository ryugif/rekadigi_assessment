import { Injectable } from '@nestjs/common';

@Injectable()
export class FiltersService {
  findAll() {
    return `This action returns all filters`;
  }

  findOne(id: number) {
    return `This action returns a #${id} filter`;
  }
}
