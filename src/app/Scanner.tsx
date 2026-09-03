"use client";

import { useEffect, useRef, useState } from "react";
import type { Html5Qrcode } from "html5-qrcode";

const API_URL = process.env.NEXT_PUBLIC_WORKER_URL || "http://localhost:8000";

type Student = Record<string, unknown> & {
    uucms?: string;
    student_name?: string;
    college_name?: string;
    college_code?: string;
    program_name?: string;
    semester?: string;
    academic_year?: string;
    barcode_placed?: boolean;
    courses?: Array<{ course_name?: string; exam_date?: string; centre_code?: string }>;
};

type LookupResponse = {
    job_id: string;
    filename: string;
    student: Student;
};

export default function Scanner() {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [scannerReady, setScannerReady] = useState(false);
    const [barcode, setBarcode] = useState("");
    const [result, setResult] = useState<LookupResponse | null>(null);
    const [message, setMessage] = useState("Point the camera at a Code128 barcode");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let mounted = true;
        let scanner: Html5Qrcode | null = null;

        async function startScanner() {
            const { Html5Qrcode } = await import("html5-qrcode");
            scanner = new Html5Qrcode("barcode-reader");
            scannerRef.current = scanner;
            try {
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.8 },
                    (decodedText) => {
                        setBarcode(decodedText);
                        void lookup(decodedText);
                    },
                    () => undefined,
                );
                if (mounted) setScannerReady(true);
            } catch {
                if (mounted) setMessage("Camera unavailable. Enter the barcode below instead.");
            }
        }

        void startScanner();
        return () => {
            mounted = false;
            if (scanner) void scanner.stop().catch(() => undefined);
        };
    }, []);

    useEffect(() => {
        const manifest = document.createElement("link");
        manifest.rel = "manifest";
        manifest.href = "/manifest.webmanifest";
        document.head.appendChild(manifest);
        navigator.serviceWorker?.register("/sw.js").catch(() => undefined);
        return () => manifest.remove();
    }, []);

    async function lookup(value: string) {
        const normalized = value.trim();
        if (!normalized || loading) return;
        setLoading(true);
        setResult(null);
        setMessage("Looking up student record...");
        try {
            const response = await fetch(`${API_URL}/lookup/${encodeURIComponent(normalized)}`);
            if (response.status === 404) throw new Error("No student record found for this barcode.");
            if (!response.ok) throw new Error("The API could not complete the lookup.");
            setResult((await response.json()) as LookupResponse);
            setMessage("Student record found");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "Lookup failed.");
        } finally {
            setLoading(false);
        }
    }

    function reset() {
        setBarcode("");
        setResult(null);
        setMessage("Point the camera at a Code128 barcode");
    }

    const student = result?.student;

    return (
        <main className="scanner-app">
            <section className="scanner-shell">
                <header className="scanner-header">
                    <div className="brand-mark">PX</div>
                    <div>
                        <p className="eyebrow">PDF Processor</p>
                        <h1>Barcode lookup</h1>
                    </div>
                    <span className={`connection-dot ${scannerReady ? "is-live" : ""}`} title={scannerReady ? "Camera active" : "Camera inactive"} />
                </header>

                <div className="scanner-grid">
                    <section className="camera-panel">
                        <div className="panel-label"><span>01</span> Scan hall ticket</div>
                        <div className="reader-frame">
                            <div id="barcode-reader" />
                            {!scannerReady && <div className="reader-placeholder"><div className="camera-glyph">▣</div><strong>Camera is getting ready</strong><span>{message}</span></div>}
                            <i className="scan-corner scan-corner--tl" /><i className="scan-corner scan-corner--tr" /><i className="scan-corner scan-corner--bl" /><i className="scan-corner scan-corner--br" />
                        </div>
                        <p className="scan-message">{message}</p>
                        <div className="manual-entry">
                            <label htmlFor="barcode-input">Manual barcode entry</label>
                            <div className="entry-row">
                                <input id="barcode-input" value={barcode} onChange={(event) => setBarcode(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void lookup(barcode); }} placeholder="Enter UUCMS registration number" />
                                <button type="button" onClick={() => void lookup(barcode)} disabled={loading || !barcode.trim()}>Find</button>
                            </div>
                        </div>
                    </section>

                    <section className={`record-panel ${student ? "has-record" : ""}`}>
                        <div className="panel-label"><span>02</span> Student record</div>
                        {!student ? (
                            <div className="empty-record"><div className="empty-number">02</div><h2>Scan a barcode<br />to reveal the record</h2><p>Extracted data is fetched securely from the processor database after a successful scan.</p></div>
                        ) : (
                            <div className="record-content">
                                <div className="record-topline"><span className="found-badge">FOUND</span><span className="record-file">{result.filename}</span></div>
                                <h2>{student.student_name || "Unnamed student"}</h2>
                                <p className="registration">{student.uucms || barcode}</p>
                                <div className="details-grid">
                                    <Detail label="College" value={student.college_name} />
                                    <Detail label="College code" value={student.college_code} />
                                    <Detail label="Program" value={student.program_name} />
                                    <Detail label="Semester" value={student.semester} />
                                    <Detail label="Academic year" value={student.academic_year} />
                                    <Detail label="Barcode" value={student.barcode_placed ? "Placed" : "Not placed"} />
                                </div>
                                {student.courses && student.courses.length > 0 && <div className="courses"><h3>Courses <span>{student.courses.length}</span></h3>{student.courses.map((course, index) => <div className="course-row" key={`${course.course_name}-${index}`}><b>{String(index + 1).padStart(2, "0")}</b><span>{course.course_name || "Course"}</span><small>{course.exam_date || ""}</small></div>)}</div>}
                                <button type="button" className="reset-button" onClick={reset}>Scan another ticket <span>↗</span></button>
                            </div>
                        )}
                    </section>
                </div>
                <footer className="scanner-footer"><span>LIVE DATABASE LOOKUP</span><span>API · {API_URL.replace(/^https?:\/\//, "")}</span></footer>
            </section>
        </main>
    );
}

function Detail({ label, value }: { label: string; value?: unknown }) {
    return <div className="detail"><span>{label}</span><strong>{value ? String(value) : "—"}</strong></div>;
}
