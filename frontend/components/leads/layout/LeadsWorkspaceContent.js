"use client";

import LeadBulkAssignCard from "../bulk/LeadBulkAssignCard";
import LeadBulkUploadPanel from "../bulk/LeadBulkUploadPanel";
import LeadListSection from "../list/LeadListSection";
import LeadsWorkspaceHeader from "./LeadsWorkspaceHeader";
import LeadsWorkspaceShell from "./LeadsWorkspaceShell";

export default function LeadsWorkspaceContent({
  allPicked, bulkUpload, bulkUsersMessage, canCreate, canEdit, canManage,
  emptyLeadsMessage, filterWorkspaceProps, filters, heroStats, isPlatformConsole,
  isSuper, listRowActions, ownershipActions, ownershipLabel, picked, pickedTeamIds,
  records, resources, setPicked, showBulkUpload, setShowBulkUpload, teamBadgeLabel,
}) {
  return (
    <LeadsWorkspaceShell>
      <LeadsWorkspaceHeader
        canCreate={canCreate}
        filtersProps={filterWorkspaceProps}
        heroStats={heroStats}
        isPlatformConsole={isPlatformConsole}
        isSuper={isSuper}
        ownershipLabel={ownershipLabel}
        setShowBulkUpload={setShowBulkUpload}
        showBulkUpload={showBulkUpload}
      />

      {canCreate && showBulkUpload ? (
        <LeadBulkUploadPanel
          blankBulkSheet={bulkUpload.blankBulkSheet}
          bulkImportColumns={bulkUpload.BULK_IMPORT_COLUMNS}
          bulkImportFields={bulkUpload.BULK_IMPORT_FIELDS}
          bulkImportMaxRows={bulkUpload.BULK_IMPORT_MAX_ROWS}
          bulkImporting={bulkUpload.bulkImporting}
          bulkUploadFile={bulkUpload.bulkUploadFile}
          bulkUploadPreview={bulkUpload.bulkUploadPreview}
          bulkUploadReport={bulkUpload.bulkUploadReport}
          bulkUploadText={bulkUpload.bulkUploadText}
          downloadBulkTemplate={bulkUpload.downloadBulkTemplate}
          handleBulkFileChange={bulkUpload.handleBulkFileChange}
          loadBulkTemplate={bulkUpload.loadBulkTemplate}
          resetBulkUploadPanel={bulkUpload.resetBulkUploadPanel}
          sampleBulkSheet={bulkUpload.sampleBulkSheet}
          setBulkUploadText={bulkUpload.setBulkUploadText}
          submitBulkUpload={bulkUpload.submitBulkUpload}
        />
      ) : null}

      {canManage && picked.length ? (
        <LeadBulkAssignCard
          bulkAssign={ownershipActions.bulkAssign}
          bulkAssigning={ownershipActions.bulkAssigning}
          bulkNote={ownershipActions.bulkNote}
          bulkOwner={ownershipActions.bulkOwner}
          bulkUsers={resources.bulkUsers}
          bulkUsersMessage={bulkUsersMessage}
          clearBulkSelection={() => {
            setPicked([]);
            ownershipActions.setBulkOwner("");
            ownershipActions.setBulkNote("");
          }}
          company={filters.company}
          isPlatformConsole={isPlatformConsole}
          pickedCount={picked.length}
          pickedTeamIds={pickedTeamIds}
          setBulkNote={ownershipActions.setBulkNote}
          setBulkOwner={ownershipActions.setBulkOwner}
        />
      ) : null}

      <LeadListSection
        activeLead={listRowActions.activeLead}
        allPicked={allPicked}
        canEdit={canEdit}
        canManage={canManage}
        emptyLeadsMessage={emptyLeadsMessage}
        leadMeta={records.leadMeta}
        page={records.page}
        picked={picked}
        rows={records.leads}
        rowActions={listRowActions}
        teamBadgeLabel={teamBadgeLabel}
        totalMatched={records.totalMatched}
        totalPages={records.totalPages}
      />
    </LeadsWorkspaceShell>
  );
}
