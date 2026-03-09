import { expect, type Page, test } from "@playwright/test";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const STORAGE_KEYS = {
  jobs: "ai_job_search_jobs_v1",
  recruiters: "ai_job_search_recruiters_v1",
  interviews: "ai_job_search_interviews_v1",
  activities: "ai_job_search_activity_v1",
} as const;
const AI_COPILOT_OVERRIDE_KEY = "ai_job_search_ai_copilot_override";

const SEEDED_DATA = {
  jobs: [
    {
      id: 1,
      company: "Acme Robotics",
      title: "QA Automation Engineer",
      status: "Applied",
      note: "Submitted on Monday",
      linkedRecruiterId: 101,
      createdAt: 1739491200000,
    },
    {
      id: 2,
      company: "Orbit AI",
      title: "Machine Learning Engineer",
      status: "Saved",
      note: "Need referral before applying",
      createdAt: 1739923200000,
    },
    {
      id: 3,
      company: "Nova Systems",
      title: "Software Engineer",
      status: "Interview",
      note: "Technical round scheduled",
      createdAt: 1740009600000,
    },
    {
      id: 4,
      company: "Delta Labs",
      title: "QA Engineer",
      status: "Rejected",
      note: "Position closed",
      createdAt: 1740096000000,
    },
    {
      id: 5,
      company: "Zen Data",
      title: "Frontend Engineer",
      status: "Saved",
      note: "Need portfolio update",
      createdAt: 1740182400000,
    },
  ],
  recruiters: [
    {
      id: 101,
      name: "Maya Chen",
      company: "Acme Robotics",
      role: "Technical Recruiter",
      email: "maya.chen@example.com",
      notes: "Initial outreach completed.",
      createdAt: 1741065600000,
    },
  ],
  interviews: [
    {
      id: 1001,
      jobId: 1,
      recruiterId: 101,
      interviewType: "Phone Screen",
      status: "Scheduled",
      scheduledAt: "2026-04-10T10:00",
      notes: "Prepare concise project examples.",
      createdAt: 1741302000000,
      updatedAt: 1741302000000,
    },
  ],
  activities: [],
};

async function seedStorage(page: Page, enableAiCopilot = false) {
  await page.addInitScript(
    ({ keys, data, enableAiCopilot, aiOverrideKey }) => {
      const markerKey = "__e2e_seeded__";

      if (enableAiCopilot) {
        window.localStorage.setItem(aiOverrideKey, "true");
      } else {
        window.localStorage.removeItem(aiOverrideKey);
      }

      if (window.localStorage.getItem(markerKey) === "1") return;

      window.localStorage.setItem(keys.jobs, JSON.stringify(data.jobs));
      window.localStorage.setItem(keys.recruiters, JSON.stringify(data.recruiters));
      window.localStorage.setItem(keys.interviews, JSON.stringify(data.interviews));
      window.localStorage.setItem(keys.activities, JSON.stringify(data.activities));
      window.localStorage.setItem(markerKey, "1");
    },
    {
      keys: STORAGE_KEYS,
      data: SEEDED_DATA,
      enableAiCopilot,
      aiOverrideKey: AI_COPILOT_OVERRIDE_KEY,
    }
  );
}

async function visitApp(page: Page, enableAiCopilot = false) {
  await seedStorage(page, enableAiCopilot);
  await page.goto("/");
}

function getPipelineSection(page: Page) {
  return page.locator("section.rounded-2xl").filter({
    has: page.getByRole("heading", { name: "Pipeline Summary" }),
  });
}

function getApplicationsSection(page: Page) {
  return page.locator("section.rounded-2xl").filter({
    has: page.getByRole("heading", { name: "Applications" }),
  });
}

async function expectPipelineCount(page: Page, status: string, count: number) {
  const card = getPipelineSection(page)
    .locator("article")
    .filter({ hasText: status })
    .first();
  await expect(card).toContainText(String(count));
}

test("shows live pipeline summary counts near the top of dashboard", async ({ page }) => {
  await visitApp(page);

  const pipeline = getPipelineSection(page);
  await expect(pipeline.getByRole("heading", { name: "Pipeline Summary" })).toBeVisible();

  await expectPipelineCount(page, "Saved", 2);
  await expectPipelineCount(page, "Applied", 1);
  await expectPipelineCount(page, "Interview", 1);
  await expectPipelineCount(page, "Rejected", 1);
});

test("validates required job fields and persists a newly added job after reload", async ({
  page,
}) => {
  await visitApp(page);

  const addJobSection = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Add Job" }),
  });

  await addJobSection.getByRole("button", { name: "Save Job" }).click();
  await expect(addJobSection.getByText("Company and Job title are required before saving.")).toBeVisible();

  await addJobSection.getByPlaceholder("Company").fill("Contoso");
  await addJobSection.getByPlaceholder("Job title").fill("SDET");
  await addJobSection.getByPlaceholder("Note (optional)").fill("Created in E2E test");
  await addJobSection.getByRole("button", { name: "Save Job" }).click();

  await expect(page.getByText("Contoso - SDET")).toBeVisible();
  await expectPipelineCount(page, "Saved", 3);

  await page.reload();
  await expect(page.getByText("Contoso - SDET")).toBeVisible();
});

test("edits and deletes a job from Applications with confirmation", async ({ page }) => {
  await visitApp(page);
  await page.getByRole("button", { name: "Applications" }).click();

  const initialRow = page.locator("article").filter({
    hasText: "Acme Robotics - QA Automation Engineer",
  });
  await expect(initialRow).toBeVisible();
  await initialRow.getByRole("button", { name: "Edit" }).click();

  const editModal = page
    .locator("div.w-full.max-w-lg")
    .filter({ has: page.getByRole("heading", { name: "Edit Job" }) });
  await expect(editModal).toBeVisible();
  await editModal.getByPlaceholder("Job title").fill("QA Automation Engineer II");
  await editModal.locator("select").selectOption("Interview");
  await editModal.getByRole("button", { name: "Save Changes" }).click();

  const updatedRow = page.locator("article").filter({
    hasText: "Acme Robotics - QA Automation Engineer II",
  });
  await expect(updatedRow).toBeVisible();
  await expect(updatedRow).toContainText("Interview");

  page.once("dialog", (dialog) => dialog.accept());
  await updatedRow.getByRole("button", { name: "Delete" }).click();
  await expect(updatedRow).toHaveCount(0);
});

test("searches jobs by company and title in Applications", async ({ page }) => {
  await visitApp(page);
  await page.getByRole("button", { name: "Applications" }).click();

  const applications = getApplicationsSection(page);
  const searchInput = applications.getByPlaceholder("Search company or title");

  await searchInput.fill("Orbit AI");
  await expect(applications.locator("article").filter({ hasText: "Orbit AI - Machine Learning Engineer" })).toBeVisible();
  await expect(applications.locator("article").filter({ hasText: "Acme Robotics - QA Automation Engineer" })).toHaveCount(0);

  await searchInput.fill("Software Engineer");
  await expect(applications.locator("article").filter({ hasText: "Nova Systems - Software Engineer" })).toBeVisible();
  await expect(applications.locator("article").filter({ hasText: "Delta Labs - QA Engineer" })).toHaveCount(0);

  await searchInput.fill("No Matching Role");
  await expect(applications.getByText("No applications match your filters. Try clearing search or status.")).toBeVisible();
});

test("filters jobs by status in Applications", async ({ page }) => {
  await visitApp(page);
  await page.getByRole("button", { name: "Applications" }).click();

  const applications = getApplicationsSection(page);
  const statusFilter = applications.locator("select").first();

  await statusFilter.selectOption("Interview");
  await expect(applications.locator("article").filter({ hasText: "Nova Systems - Software Engineer" })).toBeVisible();
  await expect(applications.locator("article").filter({ hasText: "Acme Robotics - QA Automation Engineer" })).toHaveCount(0);
  await expect(applications.locator("article").filter({ hasText: "Delta Labs - QA Engineer" })).toHaveCount(0);

  await statusFilter.selectOption("Rejected");
  await expect(applications.locator("article").filter({ hasText: "Delta Labs - QA Engineer" })).toBeVisible();
  await expect(applications.locator("article").filter({ hasText: "Nova Systems - Software Engineer" })).toHaveCount(0);

  await statusFilter.selectOption("All");
  await expect(applications.locator("article").filter({ hasText: "Acme Robotics - QA Automation Engineer" })).toBeVisible();
  await expect(applications.locator("article").filter({ hasText: "Orbit AI - Machine Learning Engineer" })).toBeVisible();
});

test("exports backup JSON and imports replacement data into UI immediately", async ({
  page,
}) => {
  await visitApp(page);

  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export Data" }).click(),
  ]);

  expect(download.suggestedFilename()).toMatch(
    /^job-search-copilot-backup-\d{4}-\d{2}-\d{2}\.json$/
  );

  const downloadPath = path.join(os.tmpdir(), `job-copilot-export-${Date.now()}.json`);
  await download.saveAs(downloadPath);
  const downloadedContent = JSON.parse(await fs.readFile(downloadPath, "utf8"));

  expect(Array.isArray(downloadedContent.jobs)).toBeTruthy();
  expect(Array.isArray(downloadedContent.recruiters)).toBeTruthy();
  expect(Array.isArray(downloadedContent.interviews)).toBeTruthy();
  expect(typeof downloadedContent.exportedAt).toBe("string");
  expect(typeof downloadedContent.appVersion).toBe("string");

  const importPayload = {
    jobs: [
      {
        id: 900,
        company: "Import Test Co",
        title: "Imported Role",
        status: "Saved",
        note: "Imported from E2E backup",
        linkedRecruiterId: 700,
        createdAt: 1742000000000,
      },
    ],
    recruiters: [
      {
        id: 700,
        name: "Import Recruiter",
        company: "Import Test Co",
        role: "Recruiter",
        email: "import.recruiter@example.com",
        notes: "Imported recruiter record",
        createdAt: 1742000000000,
      },
    ],
    interviews: [
      {
        id: 800,
        jobId: 900,
        recruiterId: 700,
        interviewType: "Phone Screen",
        status: "Scheduled",
        scheduledAt: "2026-05-20T09:00",
        notes: "Imported interview record",
        createdAt: 1742000000000,
        updatedAt: 1742000000000,
      },
    ],
  };

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import Data" }).click();
  const fileChooser = await fileChooserPromise;
  page.once("dialog", (dialog) => dialog.accept());
  await fileChooser.setFiles({
    name: "backup-import.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(importPayload)),
  });

  await expect(page.getByText("Data imported successfully")).toBeVisible();
  await expect(page.getByText("Import Test Co - Imported Role")).toBeVisible();
  await expect(page.getByText("Acme Robotics - QA Automation Engineer")).toHaveCount(0);

  await expectPipelineCount(page, "Saved", 1);
  await expectPipelineCount(page, "Applied", 0);
  await expectPipelineCount(page, "Interview", 0);
  await expectPipelineCount(page, "Rejected", 0);
});

test("rejects malformed JSON on import without overwriting existing data", async ({
  page,
}) => {
  await visitApp(page);

  const fileChooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Import Data" }).click();
  const fileChooser = await fileChooserPromise;
  await fileChooser.setFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from("{invalid-json"),
  });

  await expect(page.getByText("Invalid backup file")).toBeVisible();
  await expect(page.getByText("Acme Robotics - QA Automation Engineer")).toBeVisible();
  await expectPipelineCount(page, "Saved", 2);
});

test("keeps AI copilot controls hidden while the feature is disabled", async ({
  page,
}) => {
  await visitApp(page);

  const jobCard = page.locator("article").filter({
    hasText: "Acme Robotics - QA Automation Engineer",
  });
  await jobCard.getByRole("button", { name: "View" }).click();

  await expect(page.getByRole("button", { name: "Summarize Job" })).toHaveCount(0);
  await expect(page.getByText("AI Copilot: Disabled")).toBeVisible();
});

test("opens the AI panel and shows generated notes when copilot is enabled", async ({
  page,
}) => {
  await page.route("**/api/ai/notes", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        result:
          "- Prioritize release quality examples.\n- Expect conversation about CI ownership and regression strategy.",
      }),
    });
  });

  await visitApp(page, true);
  await expect(page.getByText("AI Copilot: Enabled")).toBeVisible();

  const jobCard = page.locator("article").filter({
    hasText: "Acme Robotics - QA Automation Engineer",
  });
  await jobCard.getByRole("button", { name: "View" }).click();
  await page.getByRole("button", { name: "Generate Notes" }).click();

  const aiPanel = page.locator("aside").filter({
    has: page.getByRole("heading", { name: "Smart Notes" }),
  });
  await expect(
    aiPanel.getByText("Prioritize release quality examples.", { exact: false })
  ).toBeVisible();
  await expect(
    page.getByText("Saved Smart Notes", { exact: false })
  ).toBeVisible();
});

test("shows a graceful retry state when the AI route fails", async ({ page }) => {
  await page.route("**/api/ai/follow-up", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        ok: false,
        error: "Provider unavailable",
        code: "provider_error",
      }),
    });
  });

  await visitApp(page, true);
  await expect(page.getByText("AI Copilot: Enabled")).toBeVisible();

  const jobCard = page.locator("article").filter({
    hasText: "Acme Robotics - QA Automation Engineer",
  });
  await jobCard.getByRole("button", { name: "View" }).click();
  await page.getByRole("button", { name: "Suggest Follow-Up" }).click();

  const aiPanel = page.locator("aside").filter({
    has: page.getByRole("heading", { name: "Suggested Follow-Up" }),
  });
  await expect(aiPanel.getByText("Provider unavailable")).toBeVisible();
  await expect(aiPanel.getByRole("button", { name: "Retry" })).toBeVisible();
});
