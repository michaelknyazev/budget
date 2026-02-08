import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { Category } from '../entities/category.entity';
import { CreateCategoryInput, UpdateCategoryInput, CategoryType } from '@budget/schemas';

@Injectable()
export class CategoryService {
  private readonly logger = new Logger(CategoryService.name);

  constructor(private readonly em: EntityManager) {}

  async findAll(userId: string): Promise<Category[]> {
    return this.em.find(Category, { user: userId });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.em.findOne(Category, { id });
    if (!category) {
      throw new NotFoundException({ message: 'Category not found', id });
    }
    return category;
  }

  async create(data: CreateCategoryInput, userId: string): Promise<Category> {
    const category = this.em.create(Category, {
      ...data,
      type: data.type as CategoryType,
      user: userId,
    });

    this.em.persist(category);
    await this.em.flush();
    this.logger.log({ categoryId: category.id }, 'Category created');

    return category;
  }

  async update(id: string, data: UpdateCategoryInput): Promise<Category> {
    const category = await this.findById(id);
    const updateData: Partial<Category> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.type !== undefined) updateData.type = data.type as CategoryType;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.color !== undefined) updateData.color = data.color;
    if (data.mccCodes !== undefined) updateData.mccCodes = data.mccCodes;
    this.em.assign(category, updateData);
    await this.em.flush();
    this.logger.log({ categoryId: id }, 'Category updated');

    return category;
  }

  async delete(id: string): Promise<void> {
    const category = await this.findById(id);
    await this.em.removeAndFlush(category);
    this.logger.log({ categoryId: id }, 'Category deleted');
  }
}
