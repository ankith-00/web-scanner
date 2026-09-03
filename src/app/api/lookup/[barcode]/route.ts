import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DATABASE || "ocr-module";
const collectionName = process.env.MONGODB_COLLECTION || "pdf-processor-jobs";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ barcode: string }> }
) {
    try {
        const { barcode } = await params;
        const normalized = decodeURIComponent(barcode ?? "").trim();

        if (!uri) {
            return NextResponse.json(
                { error: "MONGODB_URI is not configured." },
                { status: 500 }
            );
        }

        const client = new MongoClient(uri);
        await client.connect();

        const database = client.db(dbName);
        const collection = database.collection(collectionName);

        const record = await collection.findOne({
            $or: [
                { barcode: normalized },
                { uucms: normalized },
                { "student.uucms": normalized },
                { "student.barcode": normalized },
            ],
        });

        await client.close();

        if (!record) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        const student =
            record.student ??
            record.data?.student ??
            record;

        return NextResponse.json({
            job_id: record.job_id ?? record._id?.toString?.() ?? "",
            filename: record.filename ?? "",
            student,
        });
    } catch (error) {
        console.error("Mongo lookup failed:", error);
        return NextResponse.json(
            { error: "Database lookup failed" },
            { status: 500 }
        );
    }
}
