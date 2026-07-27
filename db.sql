-- DROP TYPE vehicle_status;
-- DROP TYPE vehicle_condition;
-- DROP TYPE vehicle_transmission;
-- DROP TYPE vehicle_fuel_type;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "ltree";


-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE vehicle_status AS ENUM (
    'available',
    'sold',
    'pending'
);

CREATE TYPE vehicle_condition AS ENUM (
    'new',
    'used'
);

CREATE TYPE vehicle_transmission AS ENUM (
    'automatic',
    'manual',
    'cvt',
    'dct',
    'amt'
);

CREATE TYPE vehicle_fuel_type AS ENUM (
    'gasoline',
    'diesel',
    'electric',
    'hybrid',
    'plug_in_hybrid'
);


-- ============================================================
-- CATEGORY TABLE
--
-- Example hierarchy:
--
-- Cars
-- ├── SUV
-- │   ├── 5-Seater
-- │   └── 7-Seater
-- └── Sedan
--
-- ltree paths:
-- cars
-- cars.suv
-- cars.suv.5_seater
-- cars.suv.7_seater
-- cars.sedan
-- ============================================================

CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    name VARCHAR(100) NOT NULL,

    -- URL-friendly identifier
    slug VARCHAR(100) NOT NULL,

    -- Direct parent category
    parent_id UUID
        REFERENCES categories(id)
        ON DELETE CASCADE,

    -- Materialized hierarchy path
    path LTREE NOT NULL,

    -- Root category = 0
    -- Child = 1
    -- Grandchild = 2
    depth SMALLINT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT categories_name_not_empty
        CHECK (length(trim(name)) > 0),

    CONSTRAINT categories_slug_not_empty
        CHECK (length(trim(slug)) > 0),

    CONSTRAINT categories_depth_valid
        CHECK (depth >= 0)
);


-- ============================================================
-- CATEGORY INDEXES
-- ============================================================

-- Slug lookup
CREATE UNIQUE INDEX categories_slug_unique_idx
    ON categories (slug);

-- Find direct children
CREATE INDEX categories_parent_id_idx
    ON categories (parent_id);

-- Efficient ancestor / descendant traversal
--
-- Examples:
--
-- path <@ 'cars.suv'
-- path @> 'cars.suv.7_seater'
--
CREATE INDEX categories_path_gist_idx
    ON categories
    USING GIST (path);

-- Filter by category depth
CREATE INDEX categories_depth_idx
    ON categories (depth);




-- ============================================================
-- VEHICLE TABLE
-- ============================================================

CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Vehicle belongs to a leaf or parent category
    category_id UUID NOT NULL
        REFERENCES categories(id)
        ON DELETE RESTRICT,

    -- Vehicle information
    make VARCHAR(100) NOT NULL,

    model VARCHAR(100) NOT NULL,

    year SMALLINT NOT NULL,

    -- Mileage in kilometers
    mileage INTEGER NOT NULL DEFAULT 0,

    -- Price stored as integer.
    --
    -- Example:
    -- 250000000 = 250 million
    --
    -- This avoids floating-point precision issues.
    price BIGINT NOT NULL,

    condition vehicle_condition NOT NULL,

    transmission vehicle_transmission NOT NULL,

    fuel_type vehicle_fuel_type NOT NULL,

    color VARCHAR(50) NOT NULL,

    -- Location as free text for now.
    --
    -- Example:
    -- Jakarta Selatan
    -- Bandung
    -- Surabaya
    location VARCHAR(255) NOT NULL,

    status vehicle_status NOT NULL DEFAULT 'available',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMPTZ,

    CONSTRAINT vehicles_make_not_empty
        CHECK (length(trim(make)) > 0),

    CONSTRAINT vehicles_model_not_empty
        CHECK (length(trim(model)) > 0),

    CONSTRAINT vehicles_year_valid
        CHECK (
            year >= 1886
            AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1
        ),

    CONSTRAINT vehicles_mileage_valid
        CHECK (mileage >= 0),

    CONSTRAINT vehicles_price_valid
        CHECK (price >= 0),

    CONSTRAINT vehicles_color_not_empty
        CHECK (length(trim(color)) > 0),

    CONSTRAINT vehicles_location_not_empty
        CHECK (length(trim(location)) > 0),

    CONSTRAINT vehicles_status_valid
        CHECK (status IN ('available', 'sold', 'pending'))
);


-- ============================================================
-- VEHICLE INDEXES
-- ============================================================

-- Filter vehicles by category
CREATE INDEX vehicles_category_id_idx
    ON vehicles (category_id);

-- Filter by status
CREATE INDEX vehicles_status_idx
    ON vehicles (status);

-- Filter by make
CREATE INDEX vehicles_make_idx
    ON vehicles (make);

-- Filter by year
CREATE INDEX vehicles_year_idx
    ON vehicles (year);

-- Filter by price
CREATE INDEX vehicles_price_idx
    ON vehicles (price);

-- Filter by mileage
CREATE INDEX vehicles_mileage_idx
    ON vehicles (mileage);

-- Filter by location
CREATE INDEX vehicles_location_idx
    ON vehicles (location);

-- Filter by transmission
CREATE INDEX vehicles_transmission_idx
    ON vehicles (transmission);

-- Filter by fuel type
CREATE INDEX vehicles_fuel_type_idx
    ON vehicles (fuel_type);

-- Filter by condition
CREATE INDEX vehicles_condition_idx
    ON vehicles (condition);


-- ============================================================
-- PARTIAL INDEXES
--
-- These are optimized for marketplace queries where users
-- generally only want available vehicles.
-- ============================================================

-- Latest available vehicles
CREATE INDEX vehicles_available_created_idx
    ON vehicles (created_at DESC)
    WHERE status = 'available';

-- Cheapest available vehicles
CREATE INDEX vehicles_available_price_idx
    ON vehicles (price ASC)
    WHERE status = 'available';

-- Lowest mileage available vehicles
CREATE INDEX vehicles_available_mileage_idx
    ON vehicles (mileage ASC)
    WHERE status = 'available';


-- ============================================================
-- VEHICLE IMAGES TABLE
--
-- One vehicle can have many images.
--
-- Example:
--
-- vehicles
--    │
--    ├── vehicle_images
--    │      ├── image 1
--    │      ├── image 2
--    │      └── image 3
-- ============================================================

CREATE TABLE vehicle_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    vehicle_id UUID NOT NULL
        REFERENCES vehicles(id)
        ON DELETE CASCADE,

    -- Image URL
    url TEXT NOT NULL,

    -- Controls display order
    --
    -- 0 = first image
    -- 1 = second image
    -- 2 = third image
    sort_order SMALLINT NOT NULL DEFAULT 0,

    -- Primary image shown in listings
    is_primary BOOLEAN NOT NULL DEFAULT FALSE,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT vehicle_images_url_not_empty
        CHECK (length(trim(url)) > 0),

    CONSTRAINT vehicle_images_sort_order_valid
        CHECK (sort_order >= 0)
);


-- ============================================================
-- VEHICLE IMAGE INDEXES
-- ============================================================

-- Get all images for a vehicle in order
CREATE INDEX vehicle_images_vehicle_order_idx
    ON vehicle_images (
        vehicle_id,
        sort_order
    );

-- Find primary image efficiently
--
-- Only one primary image is allowed per vehicle.
CREATE UNIQUE INDEX vehicle_images_primary_unique_idx
    ON vehicle_images (vehicle_id)
    WHERE is_primary = TRUE;


-- ============================================================
-- UPDATED_AT FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();

    RETURN NEW;
END;
$$;


-- ============================================================
-- UPDATED_AT TRIGGERS
-- ============================================================

CREATE TRIGGER categories_updated_at_trigger
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();


CREATE TRIGGER vehicles_updated_at_trigger
BEFORE UPDATE ON vehicles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();