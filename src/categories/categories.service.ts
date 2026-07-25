import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { DatabaseService } from '../database/database.service';

type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  path: string;
  depth: number;
};

type CategoryTree = {
  id: string;
  name: string;
  slug: string;
  children: CategoryTree[];
};

@Injectable()
export class CategoriesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(
    createCategoryDto: CreateCategoryDto,
  ): Promise<Category | undefined> {
    const slug = createCategoryDto.slug;
    if (!slug) {
      return undefined;
    }

    const existingCategory = await this.findOneBySlug(slug);
    if (existingCategory) {
      throw new ConflictException(
        `Category with slug ${createCategoryDto.slug} already exists`,
      );
    }

    let parentCategory: Category | undefined;
    let depth = 0;
    let path = slug;

    if (createCategoryDto.parent_id) {
      parentCategory = await this.findOne(createCategoryDto.parent_id);
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID ${createCategoryDto.parent_id} not found`,
        );
      }

      depth = parentCategory.depth + 1;
      path = `${parentCategory.path}.${slug}`;
    }

    const createdCategory = await this.databaseService.query<Category>(
      `
      INSERT INTO categories (name, slug, parent_id, path, depth)
      VALUES ($1, $2, $3, $4::ltree, $5)
      RETURNING
        id,
        name,
        slug,
        parent_id,
        path::text AS path,
        depth
      `,
      [
        createCategoryDto.name,
        createCategoryDto.slug,
        createCategoryDto.parent_id ?? null,
        path,
        depth,
      ],
    );

    return createdCategory[0];
  }

  async findAll(): Promise<unknown> {
    const categories = await this.databaseService.query(`
      SELECT
        id,
        name,
        slug,
        parent_id,
        path::text AS path,
        depth
      FROM categories
      ORDER BY path
    `);

    return this.buildCategoryTree((categories || []) as Category[]);
  }

  async findOne(id: string): Promise<Category | undefined> {
    const category = await this.databaseService.query(
      `
      SELECT
          id,
          name,
          slug,
          parent_id,
          path::text AS path,
          depth
      FROM categories
      WHERE id = $1
      `,
      [id],
    );
    return (category || [])[0] as Category | undefined;
  }

  async findOneWithChildrens(id: string): Promise<unknown> {
    const category = await this.databaseService.query(
      `
      SELECT
          id,
          name,
          slug,
          parent_id,
          path::text AS path,
          depth
      FROM categories
      WHERE path <@ (
          SELECT path
          FROM categories
          WHERE id = $1
      )
      ORDER BY path;
    `,
      [id],
    );
    return this.buildCategoryTree((category || []) as Category[], [id]);
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    const currentCategory = await this.findOne(id);
    if (!currentCategory) {
      throw new NotFoundException(`Category with ID ${id} not found`);
    }

    const slugToUpdate = updateCategoryDto.slug as string | undefined;
    if (slugToUpdate && slugToUpdate !== currentCategory.slug) {
      const existingCategory = await this.findOneBySlug(slugToUpdate);
      if (existingCategory && existingCategory.id !== id) {
        throw new ConflictException(
          `Category with slug ${slugToUpdate} already exists`,
        );
      }
    }

    let parentCategory: Category | undefined;
    let depth = currentCategory.depth;
    let path = currentCategory.path;
    const parentIdToUpdate = updateCategoryDto.parent_id as
      string | null | undefined;
    if (typeof parentIdToUpdate === 'string') {
      parentCategory = await this.findOne(parentIdToUpdate);
      if (!parentCategory) {
        throw new NotFoundException(
          `Parent category with ID ${parentIdToUpdate} not found`,
        );
      }
      depth = parentCategory.depth + 1;
      path = `${parentCategory.path}${currentCategory.id}.`;
    }

    await this.databaseService.query(
      `
      UPDATE categories
      SET name = COALESCE($2, name),
          slug = COALESCE($3, slug),
          parent_id = $4,
          depth = $5,
          path = COALESCE($6, path)
      WHERE id = $1
      `,
      [
        id,
        updateCategoryDto.name,
        slugToUpdate,
        parentIdToUpdate ?? currentCategory.parent_id,
        depth,
        path,
      ],
    );
  }

  async findOneBySlug(slug: string): Promise<Category | undefined> {
    const category = await this.databaseService.query<Category>(
      `
      SELECT
          id,
          name,
          slug,
          parent_id,
          path::text AS path,
          depth
      FROM categories
      WHERE slug = $1
      `,
      [slug],
    );

    return category[0];
  }

  private buildCategoryTree(
    categories: Category[],
    rootIds?: string[],
  ): CategoryTree[] {
    const nodeMap = new Map<string, CategoryTree>();

    // Create all nodes
    for (const category of categories) {
      nodeMap.set(category.id, {
        id: category.id,
        name: category.name,
        slug: category.slug,
        children: [],
      });
    }

    // Connect children to parents
    for (const category of categories) {
      if (!category.parent_id) {
        continue;
      }

      const node = nodeMap.get(category.id);
      const parent = nodeMap.get(category.parent_id);

      if (node && parent) {
        parent.children.push(node);
      }
    }

    // If rootIds are provided, return only those trees
    if (rootIds?.length) {
      return rootIds
        .map((id) => nodeMap.get(id))
        .filter((node): node is CategoryTree => !!node);
    }

    // Otherwise return root categories
    return categories
      .filter((category) => category.parent_id === null)
      .map((category) => nodeMap.get(category.id)!)
      .filter(Boolean);
  }
}
