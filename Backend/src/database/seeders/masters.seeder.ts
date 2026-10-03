import mongoose, {
  type ClientSession,
  type Connection,
  type Collection,
} from "mongoose";

interface MasterSeedOptions {
  connection?: Connection;
  session?: ClientSession;
}

interface MasterRecord {
  code: string;
  name: string;
  description?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface MasterSeedDefinition {
  collection: string;
  records: Array<{
    code: string;
    name: string;
    description?: string;
  }>;
}

interface MasterSeedResult {
  collection: string;
  inserted: number;
  existing: number;
}

const MASTER_DEFINITIONS: MasterSeedDefinition[] = [
  {
    collection: "countries",
    records: [
      {
        code: "IN",
        name: "India",
        description: "India",
      },
      {
        code: "AE",
        name: "United Arab Emirates",
        description: "United Arab Emirates",
      },
      {
        code: "SG",
        name: "Singapore",
        description: "Singapore",
      },
      {
        code: "US",
        name: "United States",
        description: "United States of America",
      },
      {
        code: "GB",
        name: "United Kingdom",
        description: "United Kingdom",
      },
    ],
  },
  {
    collection: "currencies",
    records: [
      {
        code: "INR",
        name: "Indian Rupee",
        description: "Indian Rupee",
      },
      {
        code: "USD",
        name: "US Dollar",
        description: "United States Dollar",
      },
      {
        code: "EUR",
        name: "Euro",
        description: "Euro",
      },
      {
        code: "AED",
        name: "UAE Dirham",
        description: "United Arab Emirates Dirham",
      },
      {
        code: "SGD",
        name: "Singapore Dollar",
        description: "Singapore Dollar",
      },
    ],
  },
  {
    collection: "units",
    records: [
      {
        code: "KG",
        name: "Kilogram",
        description: "Weight unit",
      },
      {
        code: "MT",
        name: "Metric Ton",
        description: "Metric ton",
      },
      {
        code: "CBM",
        name: "Cubic Meter",
        description: "Volume unit",
      },
      {
        code: "PCS",
        name: "Pieces",
        description: "Piece count",
      },
      {
        code: "BOX",
        name: "Box",
        description: "Box count",
      },
    ],
  },
  {
    collection: "package_types",
    records: [
      {
        code: "BOX",
        name: "Box",
        description: "Standard box package",
      },
      {
        code: "PALLET",
        name: "Pallet",
        description: "Palletized cargo",
      },
      {
        code: "CRATE",
        name: "Crate",
        description: "Crated cargo",
      },
      {
        code: "BAG",
        name: "Bag",
        description: "Bagged cargo",
      },
      {
        code: "CARTON",
        name: "Carton",
        description: "Carton package",
      },
    ],
  },
  {
    collection: "cargo_types",
    records: [
      {
        code: "GENERAL",
        name: "General Cargo",
        description: "General non-special cargo",
      },
      {
        code: "PERISHABLE",
        name: "Perishable",
        description: "Temperature-sensitive or perishable cargo",
      },
      {
        code: "DANGEROUS",
        name: "Dangerous Goods",
        description: "Dangerous or regulated cargo",
      },
      {
        code: "FRAGILE",
        name: "Fragile",
        description: "Fragile cargo",
      },
      {
        code: "VALUABLE",
        name: "Valuable Cargo",
        description: "High-value cargo",
      },
    ],
  },
  {
    collection: "payment_modes",
    records: [
      {
        code: "CASH",
        name: "Cash",
        description: "Cash payment",
      },
      {
        code: "BANK_TRANSFER",
        name: "Bank Transfer",
        description: "Bank transfer",
      },
      {
        code: "CARD",
        name: "Card",
        description: "Card payment",
      },
      {
        code: "UPI",
        name: "UPI",
        description: "UPI payment",
      },
      {
        code: "CHEQUE",
        name: "Cheque",
        description: "Cheque payment",
      },
    ],
  },
  {
    collection: "service_types",
    records: [
      {
        code: "AIR",
        name: "Air Freight",
        description: "Air freight service",
      },
      {
        code: "OCEAN",
        name: "Ocean Freight",
        description: "Ocean freight service",
      },
      {
        code: "LAND",
        name: "Land Freight",
        description: "Road or land freight service",
      },
      {
        code: "COURIER",
        name: "Courier",
        description: "Courier or express service",
      },
      {
        code: "CUSTOMS",
        name: "Customs Clearance",
        description: "Customs clearance service",
      },
      {
        code: "WAREHOUSE",
        name: "Warehousing",
        description: "Warehousing service",
      },
    ],
  },
  {
    collection: "incoterms",
    records: [
      {
        code: "EXW",
        name: "EXW",
        description: "Ex Works",
      },
      {
        code: "FOB",
        name: "FOB",
        description: "Free On Board",
      },
      {
        code: "CIF",
        name: "CIF",
        description: "Cost, Insurance and Freight",
      },
      {
        code: "CFR",
        name: "CFR",
        description: "Cost and Freight",
      },
      {
        code: "DAP",
        name: "DAP",
        description: "Delivered At Place",
      },
      {
        code: "DDP",
        name: "DDP",
        description: "Delivered Duty Paid",
      },
    ],
  },
  {
    collection: "shipment_statuses",
    records: [
      {
        code: "DRAFT",
        name: "Draft",
        description: "Shipment draft",
      },
      {
        code: "BOOKED",
        name: "Booked",
        description: "Shipment booked",
      },
      {
        code: "IN_TRANSIT",
        name: "In Transit",
        description: "Shipment is in transit",
      },
      {
        code: "CUSTOMS",
        name: "Customs",
        description: "Shipment is under customs processing",
      },
      {
        code: "OUT_FOR_DELIVERY",
        name: "Out for Delivery",
        description: "Shipment is out for delivery",
      },
      {
        code: "DELIVERED",
        name: "Delivered",
        description: "Shipment delivered",
      },
      {
        code: "CANCELLED",
        name: "Cancelled",
        description: "Shipment cancelled",
      },
    ],
  },
];

function getConnection(
  connection?: Connection,
): Connection {
  const databaseConnection =
    connection ?? mongoose.connection;

  if (databaseConnection.readyState !== 1) {
    throw new Error(
      "MongoDB connection is not ready. Connect to the database before running the masters seeder.",
    );
  }

  return databaseConnection;
}

function getCollection(
  connection: Connection,
  collectionName: string,
): Collection<MasterRecord> {
  return connection.collection<MasterRecord>(
    collectionName,
  );
}

async function ensureCollectionIndexes(
  collection: Collection<MasterRecord>,
): Promise<void> {
  await collection.createIndex(
    {
      code: 1,
    },
    {
      unique: true,
      name: "uniq_master_code",
    },
  );

  await collection.createIndex(
    {
      name: 1,
    },
    {
      name: "idx_master_name",
    },
  );

  await collection.createIndex(
    {
      isActive: 1,
      isDeleted: 1,
    },
    {
      name: "idx_master_active_deleted",
    },
  );
}

async function seedCollection(
  connection: Connection,
  definition: MasterSeedDefinition,
  session?: ClientSession,
): Promise<MasterSeedResult> {
  const collection = getCollection(
    connection,
    definition.collection,
  );

  await ensureCollectionIndexes(collection);

  const existingRecords = await collection
    .find(
      {
        code: {
          $in: definition.records.map(
            (record) => record.code,
          ),
        },
        isDeleted: {
          $ne: true,
        },
      },
      {
        projection: {
          code: 1,
        },
        session,
      },
    )
    .toArray();

  const existingCodes = new Set(
    existingRecords.map((record) => record.code),
  );

  const now = new Date();

  const recordsToInsert: MasterRecord[] =
    definition.records
      .filter(
        (record) => !existingCodes.has(record.code),
      )
      .map((record) => ({
        _id: new mongoose.Types.ObjectId(),
        code: record.code,
        name: record.name,
        description: record.description,
        isActive: true,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      }));

  if (recordsToInsert.length > 0) {
    await collection.insertMany(
      recordsToInsert,
      {
        ordered: true,
        session,
      },
    );
  }

  return {
    collection: definition.collection,
    inserted: recordsToInsert.length,
    existing: existingRecords.length,
  };
}

export async function seedMasters(
  options: MasterSeedOptions = {},
): Promise<MasterSeedResult[]> {
  const connection = getConnection(
    options.connection,
  );

  const results: MasterSeedResult[] = [];

  for (const definition of MASTER_DEFINITIONS) {
    const result = await seedCollection(
      connection,
      definition,
      options.session,
    );

    results.push(result);
  }

  return results;
}

export async function runMastersSeeder(): Promise<
  MasterSeedResult[]
> {
  return seedMasters();
}