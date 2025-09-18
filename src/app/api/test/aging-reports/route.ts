import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import { getValidConnection } from "@/lib/quickbooks/connectionManager";
import { QuickBooksServerAPI } from "@/lib/quickbooks/quickbooksServerAPI";

export const dynamic = "force-dynamic";

interface AgingTestResult {
  endpoint: string;
  url: string;
  success: boolean;
  response?: any;
  error?: string;
  notes?: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log("🧪 Testing QuickBooks Aging Reports APIs...");

    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.dbId) {
      return NextResponse.json(
        {
          error: "Not authenticated",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Get valid connection
    const connection = await getValidConnection(session.user.dbId);
    const qbAPI = new QuickBooksServerAPI(
      connection.access_token,
      connection.refresh_token,
      connection.realm_id
    );

    const results: AgingTestResult[] = [];
    const testDate = new Date().toISOString().split("T")[0];

    // Test 1: Native Aging Reports
    console.log("📊 Testing native aging report endpoints...");

    const nativeEndpoints = [
      "reports/AgedReceivables",
      "reports/AgedPayables",
      "reports/ARAgingSummary",
      "reports/APAgingSummary",
    ];

    for (const endpoint of nativeEndpoints) {
      try {
        console.log(`🔍 Testing ${endpoint}...`);

        // Use private makeRequest method via reflection to test endpoints
        const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/${endpoint}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          results.push({
            endpoint,
            url,
            success: true,
            response: {
              headers: data.Header || "No header found",
              columns: data.Columns || "No columns found",
              rowCount: data.Rows?.Row?.length || 0,
              sampleData: data.Rows?.Row?.slice(0, 2) || "No rows found",
            },
            notes: `Successfully retrieved aging report data`,
          });
        } else {
          const errorText = await response.text();
          results.push({
            endpoint,
            url,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            notes:
              "Native aging report endpoint not available or misconfigured",
          });
        }
      } catch (error) {
        results.push({
          endpoint,
          url: `Error constructing URL`,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          notes: "Exception occurred during native endpoint test",
        });
      }
    }

    // Test 2: Fallback Transaction Queries
    console.log("💳 Testing fallback transaction approaches...");

    const transactionQueries = [
      {
        name: "Invoice Query",
        query: "SELECT * FROM Invoice",
        notes: "Retrieve invoices for A/R aging calculation",
      },
      {
        name: "Bill Query",
        query: "SELECT * FROM Bill",
        notes: "Retrieve bills for A/P aging calculation",
      },
      {
        name: "Payment Query",
        query: "SELECT * FROM Payment",
        notes: "Retrieve payments to track payment status",
      },
    ];

    for (const testQuery of transactionQueries) {
      try {
        console.log(`🔍 Testing ${testQuery.name}...`);

        const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/query`;
        const queryUrl = `${url}?query=${encodeURIComponent(testQuery.query)}`;

        const response = await fetch(queryUrl, {
          headers: {
            Authorization: `Bearer ${connection.access_token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const queryResponse = data.QueryResponse;
          const entityType = Object.keys(queryResponse)[0];
          const entities = queryResponse[entityType] || [];

          results.push({
            endpoint: `query: ${testQuery.query}`,
            url: queryUrl,
            success: true,
            response: {
              entityType,
              entityCount: entities.length,
              sampleEntity: entities[0] || "No entities found",
              availableFields: entities[0] ? Object.keys(entities[0]) : [],
            },
            notes: `${testQuery.notes} - Found ${entities.length} records`,
          });
        } else {
          const errorText = await response.text();
          results.push({
            endpoint: `query: ${testQuery.query}`,
            url: queryUrl,
            success: false,
            error: `HTTP ${response.status}: ${errorText}`,
            notes: `${testQuery.notes} - Query failed`,
          });
        }
      } catch (error) {
        results.push({
          endpoint: `query: ${testQuery.query}`,
          url: "Error constructing query URL",
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
          notes: `${testQuery.notes} - Exception during query`,
        });
      }
    }

    // Test 3: Company Information (for reference)
    console.log("🏢 Testing company info for context...");
    try {
      const url = `https://sandbox-quickbooks.api.intuit.com/v3/company/${connection.realm_id}/companyinfo/${connection.realm_id}`;

      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${connection.access_token}`,
          Accept: "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        const companyInfo = data.QueryResponse?.CompanyInfo?.[0];

        results.push({
          endpoint: "companyinfo",
          url,
          success: true,
          response: {
            companyName: companyInfo?.Name || "Unknown",
            country: companyInfo?.Country || "Unknown",
            fiscalYearStart: companyInfo?.FiscalYearStartMonth || "Unknown",
            industryType: companyInfo?.IndustryType || "Unknown",
          },
          notes: "Company context for aging report configuration",
        });
      }
    } catch (error) {
      console.log("Company info test failed (non-critical):", error);
    }

    // Generate summary
    const successfulTests = results.filter((r) => r.success);
    const failedTests = results.filter((r) => !r.success);

    const summary = {
      totalTests: results.length,
      successful: successfulTests.length,
      failed: failedTests.length,
      nativeAgingReportsAvailable: successfulTests.some((r) =>
        r.endpoint.includes("Aged")
      ),
      transactionQueriesWorking: successfulTests.some((r) =>
        r.endpoint.includes("query")
      ),
      recommendedApproach: "",
      nextSteps: [] as string[],
    };

    // Determine recommended approach
    if (summary.nativeAgingReportsAvailable) {
      summary.recommendedApproach = "Use native QuickBooks aging reports";
      summary.nextSteps = [
        "Implement service layer using native aging report endpoints",
        "Parse aging report response structure",
        "Integrate with existing WorkingCapitalModeler",
      ];
    } else if (summary.transactionQueriesWorking) {
      summary.recommendedApproach =
        "Build aging calculations from transaction data";
      summary.nextSteps = [
        "Implement aging bucket calculations (0-30, 31-60, 61-90, 90+ days)",
        "Query invoices and bills with payment status",
        "Calculate aging based on due dates vs current date",
        "Integrate calculated aging data with WorkingCapitalModeler",
      ];
    } else {
      summary.recommendedApproach =
        "API access issues detected - investigate authentication/permissions";
      summary.nextSteps = [
        "Verify QuickBooks app permissions include invoice/bill access",
        "Check if sandbox vs production environment affects available endpoints",
        "Consider alternative data access patterns",
      ];
    }

    return NextResponse.json({
      success: true,
      test: "QuickBooks Aging Reports API Discovery",
      testDate,
      connectionInfo: {
        realmId: connection.realm_id,
        hasValidToken: !!connection.access_token,
        tokenType: "Bearer",
      },
      summary,
      detailedResults: results,
      documentation: {
        message:
          "This test discovers QuickBooks aging report capabilities before building services",
        nextPhase:
          "Use these results to implement appropriate aging data service layer",
        references: [
          "QB API docs: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/report",
          "Aging Reports: https://developer.intuit.com/app/developer/qbo/docs/api/accounting/report#aged-payables",
        ],
      },
    });
  } catch (error) {
    console.error("❌ Aging reports test failed:", error);
    return NextResponse.json(
      {
        error: "Aging reports test failed",
        details: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
