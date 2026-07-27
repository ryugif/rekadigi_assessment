import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { DatabaseService } from '../database/database.service';

type SuggestionFilters = {
  make?: string;
  model?: string;
  city?: string;
};

type ListingFilters = SuggestionFilters & {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  year?: number;
  fuelType?: string;
  transmission?: string;
  condition?: string;
  status?: string;
  hasPrimaryImage?: boolean;
};

type EnumFilterAttribute = {
  key: string;
  type: 'enum';
  label: string;
  options: string[];
};

type RangeFilterAttribute = {
  key: string;
  type: 'range';
  label: string;
  min: number;
  max: number;
};

type BooleanFilterAttribute = {
  key: string;
  type: 'boolean';
  label: string;
};

type FilterAttribute =
  EnumFilterAttribute | RangeFilterAttribute | BooleanFilterAttribute;

@Injectable()
export class VehiclesService {
  constructor(private readonly databaseService: DatabaseService) {}

  private parseFilters(filters?: string): ListingFilters {
    if (!filters) {
      return {};
    }

    try {
      const parsed = JSON.parse(filters) as ListingFilters;
      return parsed ?? {};
    } catch {
      throw new BadRequestException(
        'filters must be a valid JSON object string',
      );
    }
  }

  private appendSearchCondition(
    whereClause: string,
    queryParams: (string | number | boolean)[],
    search?: string,
  ): {
    whereClause: string;
    queryParams: (string | number | boolean)[];
  } {
    const term = search?.trim();

    if (!term) {
      return { whereClause, queryParams };
    }

    const searchParam = `%${term}%`;
    const paramIndex = queryParams.length + 1;

    whereClause += `
      AND (
        v.make ILIKE $${paramIndex}
        OR v.model ILIKE $${paramIndex}
        OR CONCAT_WS(' ', v.make, v.model) ILIKE $${paramIndex}
        OR v.location ILIKE $${paramIndex}
      )`;
    queryParams.push(searchParam);

    return { whereClause, queryParams };
  }

  private appendFilterConditions(filters: ListingFilters | SuggestionFilters): {
    whereClause: string;
    queryParams: (string | number | boolean)[];
  } {
    let whereClause = 'WHERE v.deleted_at IS NULL';
    const queryParams: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if ('categoryId' in filters && filters.categoryId !== undefined) {
      whereClause += ` AND c.path <@ (SELECT path FROM categories WHERE id = $${paramIndex})`;
      queryParams.push(filters.categoryId);
      paramIndex++;
    }

    if (filters.make) {
      whereClause += ` AND v.make ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.make}%`);
      paramIndex++;
    }

    if (filters.model) {
      whereClause += ` AND v.model ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.model}%`);
      paramIndex++;
    }

    if (filters.city) {
      whereClause += ` AND v.location ILIKE $${paramIndex}`;
      queryParams.push(`%${filters.city}%`);
      paramIndex++;
    }

    if ('minPrice' in filters && filters.minPrice !== undefined) {
      whereClause += ` AND v.price >= $${paramIndex}`;
      queryParams.push(filters.minPrice);
      paramIndex++;
    }

    if ('maxPrice' in filters && filters.maxPrice !== undefined) {
      whereClause += ` AND v.price <= $${paramIndex}`;
      queryParams.push(filters.maxPrice);
      paramIndex++;
    }

    if ('year' in filters && filters.year !== undefined) {
      whereClause += ` AND v.year = $${paramIndex}`;
      queryParams.push(filters.year);
      paramIndex++;
    }

    if ('fuelType' in filters && filters.fuelType !== undefined) {
      whereClause += ` AND v.fuel_type = $${paramIndex}`;
      queryParams.push(filters.fuelType);
      paramIndex++;
    }

    if ('transmission' in filters && filters.transmission !== undefined) {
      whereClause += ` AND v.transmission = $${paramIndex}`;
      queryParams.push(filters.transmission);
      paramIndex++;
    }

    if ('condition' in filters && filters.condition !== undefined) {
      whereClause += ` AND v.condition = $${paramIndex}`;
      queryParams.push(filters.condition);
      paramIndex++;
    }

    if ('status' in filters && filters.status !== undefined) {
      whereClause += ` AND v.status = $${paramIndex}`;
      queryParams.push(filters.status);
      paramIndex++;
    }

    if ('hasPrimaryImage' in filters && filters.hasPrimaryImage !== undefined) {
      whereClause += filters.hasPrimaryImage
        ? ' AND EXISTS (SELECT 1 FROM vehicle_images vi WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE)'
        : ' AND NOT EXISTS (SELECT 1 FROM vehicle_images vi WHERE vi.vehicle_id = v.id AND vi.is_primary = TRUE)';
    }

    return { whereClause, queryParams };
  }

  private getVehicleBaseColumns() {
    return `
      v.id,
      v.make,
      v.model,
      v.year,
      v.mileage,
      v.price,
      v.condition,
      v.transmission,
      v.fuel_type,
      v.color,
      v.location,
      v.status
    `;
  }

  private getVehicleSelectQuery() {
    return `
      SELECT
        ${this.getVehicleBaseColumns()},
        v.created_at,
        v.updated_at,
        JSON_BUILD_OBJECT(
          'id', c.id,
          'name', c.name,
          'slug', c.slug
        ) AS category,
        primary_image.image AS primary_image
      FROM vehicles v
      LEFT JOIN categories c
        ON c.id = v.category_id
      LEFT JOIN LATERAL (
        SELECT JSON_BUILD_OBJECT(
          'id', vi.id,
          'url', vi.url,
          'sort_order', vi.sort_order,
          'is_primary', vi.is_primary
        ) AS image
        FROM vehicle_images vi
        WHERE vi.vehicle_id = v.id
          AND vi.is_primary = TRUE
        ORDER BY vi.sort_order
        LIMIT 1
      ) primary_image ON TRUE
      WHERE v.deleted_at IS NULL
    `;
  }

  async create(createVehicleDto: CreateVehicleDto) {
    const { make, model, year, price } = createVehicleDto;
    const result = await this.databaseService.query(
      `INSERT INTO vehicles (make, model, year, price)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [make, model, year, price],
    );
    const vehicleId = result[0].id as string;

    if (createVehicleDto.images && createVehicleDto.images.length > 0) {
      let primaryImage = createVehicleDto.images.find(
        (image) => image.is_primary,
      );
      if (!primaryImage) {
        primaryImage = createVehicleDto.images[0];
        primaryImage.is_primary = true;
      }

      const imageInsertPromises = createVehicleDto.images.map((image) =>
        this.databaseService.query(
          `INSERT INTO vehicle_images (vehicle_id, url, sort_order, is_primary)
           VALUES ($1, $2, $3, $4)`,
          [vehicleId, image.url, image.sort_order, image.is_primary],
        ),
      );
      await Promise.all(imageInsertPromises);
    }

    return result[0];
  }

  async findAll({
    page,
    limit,
    sortBy,
    sortOrder,
    search,
    filters,
  }: {
    page: number;
    limit: number;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
    search?: string;
    filters?: string;
  }) {
    const sortColumnMap: Record<string, string> = {
      id: 'v.id',
      name: "CONCAT_WS(' ', v.make, v.model)",
      createdAt: 'v.created_at',
      updatedAt: 'v.updated_at',
    };
    const safeSortBy = sortColumnMap[sortBy] ?? 'v.id';

    const parsedFilters = this.parseFilters(filters);
    const { whereClause: baseWhereClause, queryParams: baseQueryParams } =
      this.appendFilterConditions(parsedFilters);
    const { whereClause, queryParams } = this.appendSearchCondition(
      baseWhereClause,
      baseQueryParams,
      search,
    );

    const safeSortOrder = sortOrder === 'desc' ? 'DESC' : 'ASC';

    const limitParam = queryParams.length + 1;
    const offsetParam = queryParams.length + 2;

    const [data, totalResult] = await Promise.all([
      this.databaseService.query(
        `SELECT
            ${this.getVehicleBaseColumns()},
            primary_image.image AS primary_image
        FROM vehicles v
        LEFT JOIN categories c
          ON c.id = v.category_id
        LEFT JOIN LATERAL (
            SELECT JSON_BUILD_OBJECT(
                'id', vi.id,
                'url', vi.url
            ) AS image
            FROM vehicle_images vi
            WHERE vi.vehicle_id = v.id
              AND vi.is_primary = TRUE
            ORDER BY vi.sort_order
            LIMIT 1
        ) primary_image ON TRUE
        ${whereClause}
         ORDER BY ${safeSortBy} ${safeSortOrder}
         LIMIT $${limitParam} OFFSET $${offsetParam}`,
        [...queryParams, limit, (page - 1) * limit],
      ),
      this.databaseService.query<{ total: string }>(
        `SELECT COUNT(*)::text AS total
         FROM vehicles v
         LEFT JOIN categories c
           ON c.id = v.category_id
         ${whereClause}`,
        queryParams,
      ),
    ]);

    return {
      data,
      total: Number(totalResult[0]?.total ?? 0),
      page,
      limit,
      totalPages: Math.ceil(Number(totalResult[0]?.total ?? 0) / limit),
    };
  }

  async findAllByCategoryId(
    categoryId: string,
    {
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      filters,
    }: {
      page: number;
      limit: number;
      sortBy: string;
      sortOrder: 'asc' | 'desc';
      search?: string;
      filters?: string;
    },
  ) {
    const parsedFilters = this.parseFilters(filters);

    return this.findAll({
      page,
      limit,
      sortBy,
      sortOrder,
      search,
      filters: JSON.stringify({
        ...parsedFilters,
        categoryId,
      }),
    });
  }

  async suggestions(search: string, limit: number, filters?: string) {
    const parsedFilters = this.parseFilters(filters) as SuggestionFilters;
    const { whereClause: baseWhereClause, queryParams: baseQueryParams } =
      this.appendFilterConditions(parsedFilters);
    const { whereClause, queryParams } = this.appendSearchCondition(
      baseWhereClause,
      baseQueryParams,
      search,
    );

    const results = await this.databaseService.query(
      `SELECT
          v.id,
          CONCAT_WS(' ', v.make, v.model) AS name
       FROM vehicles v
       LEFT JOIN categories c
         ON c.id = v.category_id
       ${whereClause}
       ORDER BY name ASC
       LIMIT $${queryParams.length + 1}`,
      [...queryParams, limit],
    );

    return results;
  }

  async getFilterAttributes(categoryId: string) {
    const [rootCategoryResult] = await this.databaseService.query<{
      root_slug: string;
    }>(
      `
      SELECT
        split_part(c.path::text, '.', 1) AS root_slug
      FROM categories c
      WHERE c.id = $1
      LIMIT 1
      `,
      [categoryId],
    );

    const rootSlug = rootCategoryResult?.root_slug;

    const [
      rangeResult,
      conditionValues,
      transmissionValues,
      statusValues,
      fuelTypeValues,
    ] = await Promise.all([
      this.databaseService.query<{
        min_price: string | null;
        max_price: string | null;
        min_year: string | null;
        max_year: string | null;
        min_mileage: string | null;
        max_mileage: string | null;
      }>(
        `
          SELECT
            MIN(v.price)::text AS min_price,
            MAX(v.price)::text AS max_price,
            MIN(v.year)::text AS min_year,
            MAX(v.year)::text AS max_year,
            MIN(v.mileage)::text AS min_mileage,
            MAX(v.mileage)::text AS max_mileage
          FROM vehicles v
          JOIN categories c
            ON c.id = v.category_id
          WHERE v.deleted_at IS NULL
            AND c.path <@ (SELECT path FROM categories WHERE id = $1)
          `,
        [categoryId],
      ),
      this.databaseService.query<{ value: string }>(
        `
          SELECT DISTINCT v.condition::text AS value
          FROM vehicles v
          JOIN categories c
            ON c.id = v.category_id
          WHERE v.deleted_at IS NULL
            AND c.path <@ (SELECT path FROM categories WHERE id = $1)
          ORDER BY value
          `,
        [categoryId],
      ),
      this.databaseService.query<{ value: string }>(
        `
          SELECT DISTINCT v.transmission::text AS value
          FROM vehicles v
          JOIN categories c
            ON c.id = v.category_id
          WHERE v.deleted_at IS NULL
            AND c.path <@ (SELECT path FROM categories WHERE id = $1)
          ORDER BY value
          `,
        [categoryId],
      ),
      this.databaseService.query<{ value: string }>(
        `
          SELECT DISTINCT v.status::text AS value
          FROM vehicles v
          JOIN categories c
            ON c.id = v.category_id
          WHERE v.deleted_at IS NULL
            AND c.path <@ (SELECT path FROM categories WHERE id = $1)
          ORDER BY value
          `,
        [categoryId],
      ),
      this.databaseService.query<{ value: string }>(
        `
          SELECT DISTINCT v.fuel_type::text AS value
          FROM vehicles v
          JOIN categories c
            ON c.id = v.category_id
          WHERE v.deleted_at IS NULL
            AND c.path <@ (SELECT path FROM categories WHERE id = $1)
          ORDER BY value
          `,
        [categoryId],
      ),
    ]);

    const rangeRow = rangeResult[0];
    const attributes: FilterAttribute[] = [];

    if (rangeRow?.min_price && rangeRow?.max_price) {
      attributes.push({
        key: 'price',
        type: 'range',
        label: 'Price',
        min: Number(rangeRow.min_price),
        max: Number(rangeRow.max_price),
      });
    }

    if (rangeRow?.min_year && rangeRow?.max_year) {
      attributes.push({
        key: 'year',
        type: 'range',
        label: 'Year',
        min: Number(rangeRow.min_year),
        max: Number(rangeRow.max_year),
      });
    }

    if (rangeRow?.min_mileage && rangeRow?.max_mileage) {
      attributes.push({
        key: 'mileage',
        type: 'range',
        label: 'Mileage',
        min: Number(rangeRow.min_mileage),
        max: Number(rangeRow.max_mileage),
      });
    }

    if (conditionValues.length > 0) {
      attributes.push({
        key: 'condition',
        type: 'enum',
        label: 'Condition',
        options: conditionValues.map((item) => item.value),
      });
    }

    if (transmissionValues.length > 0) {
      attributes.push({
        key: 'transmission',
        type: 'enum',
        label: 'Transmission',
        options: transmissionValues.map((item) => item.value),
      });
    }

    if (statusValues.length > 0) {
      attributes.push({
        key: 'status',
        type: 'enum',
        label: 'Status',
        options: statusValues.map((item) => item.value),
      });
    }

    // Fuel type is only exposed for car-like categories.
    const canShowFuelType = ['cars', 'electric_vehicles'].includes(rootSlug);

    if (canShowFuelType && fuelTypeValues.length > 0) {
      attributes.push({
        key: 'fuelType',
        type: 'enum',
        label: 'Fuel Type',
        options: fuelTypeValues.map((item) => item.value),
      });
    }

    attributes.push({
      key: 'hasPrimaryImage',
      type: 'boolean',
      label: 'Has Primary Image',
    });

    return {
      categoryId,
      attributes,
    };
  }

  async checkVehicleExists(id: string): Promise<boolean> {
    const result = await this.databaseService.query(
      `SELECT 1 FROM vehicles WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
    return result.length > 0;
  }

  async findOne(id: string) {
    const result = await this.databaseService.query(
      `${this.getVehicleSelectQuery()} AND v.id = $1`,
      [id],
    );
    return result[0];
  }

  async update(id: string, updateVehicleDto: UpdateVehicleDto) {
    const fields = Object.keys(updateVehicleDto);
    const values = Object.values(updateVehicleDto);

    if (fields.length === 0) {
      return await this.findOne(id);
    }

    const setClause = fields
      .map((field, index) => `${field} = $${index + 1}`)
      .join(', ');

    const result = await this.databaseService.query(
      `UPDATE vehicles SET ${setClause}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      [...values, id],
    );

    if (updateVehicleDto.images) {
      await this.databaseService.query(
        `
        UPDATE vehicle_images
        SET is_primary = FALSE
        WHERE vehicle_id = $1
      `,
        [id],
      );
    }
    return result[0];
  }

  remove(id: string) {
    return this.databaseService.query(
      `UPDATE vehicles SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}
