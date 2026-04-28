CREATE TABLE IF NOT EXISTS load
(
    id                           UUID PRIMARY KEY,

    customer                     TEXT,
    reference_number             TEXT           NOT NULL,
    customer_rate                NUMERIC(10, 2),
    contact_name                 TEXT           NOT NULL,

    carrier                      TEXT,
    carrier_payment_method       TEXT,
    carrier_rate                 NUMERIC(10, 2) NOT NULL,
    charge_service_fee_to_office BOOLEAN                 DEFAULT FALSE,

    load_type                    TEXT           NOT NULL,
    service_type                 TEXT           NOT NULL,
    service_given_as             TEXT           NOT NULL,
    commodity                    TEXT           NOT NULL,
    booked_as                    TEXT           NOT NULL,
    sold_as                      TEXT           NOT NULL,
    weight                       TEXT           NOT NULL,
    temperature                  TEXT,

    pickup_city_zip_code         TEXT,
    pickup_phone                 TEXT           NOT NULL,
    pickup_carrier               TEXT           NOT NULL,
    pickup_name                  TEXT           NOT NULL,
    pickup_address               TEXT           NOT NULL,

    dropoff_city_zip_code        TEXT,
    dropoff_phone                TEXT           NOT NULL,
    dropoff_carrier              TEXT           NOT NULL,
    dropoff_name                 TEXT           NOT NULL,
    dropoff_address              TEXT           NOT NULL,

    branch_id                    UUID           NOT NULL,

    status                       TEXT           NOT NULL DEFAULT 'Pending',
    status_changed_by            VARCHAR(255)   NULL,

    created_at                   TIMESTAMP               DEFAULT NOW(),
    updated_at                   TIMESTAMP               DEFAULT NOW()
);

CREATE TABLE load_files
(
    load_id UUID NOT NULL,
    file_id UUID NOT NULL,
    PRIMARY KEY (load_id, file_id)
);


