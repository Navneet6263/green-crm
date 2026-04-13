-- Validation queries for team access-control rollout
-- Set @CompanyId when checking a single tenant. Leave NULL for all companies.

DECLARE @CompanyId NVARCHAR(20) = 'CI0002';

-- Duplicate tenant user keys must be zero before adding uq_users_company_user_id
SELECT company_id, user_id, COUNT(*) AS duplicate_count
FROM users
GROUP BY company_id, user_id
HAVING COUNT(*) > 1;

-- Null team ownership counts by record type
SELECT 'leads' AS entity, company_id, COUNT(*) AS null_team_records
FROM leads
WHERE team_id IS NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY company_id
UNION ALL
SELECT 'customers' AS entity, company_id, COUNT(*) AS null_team_records
FROM customers
WHERE team_id IS NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY company_id
UNION ALL
SELECT 'tasks' AS entity, company_id, COUNT(*) AS null_team_records
FROM tasks
WHERE team_id IS NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY company_id
UNION ALL
SELECT 'products' AS entity, company_id, COUNT(*) AS null_team_records
FROM products
WHERE team_id IS NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY company_id;

-- Records pointing to missing teams must be zero
SELECT 'leads' AS entity, COUNT(*) AS invalid_team_refs
FROM leads l
LEFT JOIN teams t ON t.company_id = l.company_id AND t.team_id = l.team_id
WHERE l.team_id IS NOT NULL
  AND t.team_id IS NULL
  AND (@CompanyId IS NULL OR l.company_id = @CompanyId)
UNION ALL
SELECT 'customers' AS entity, COUNT(*) AS invalid_team_refs
FROM customers c
LEFT JOIN teams t ON t.company_id = c.company_id AND t.team_id = c.team_id
WHERE c.team_id IS NOT NULL
  AND t.team_id IS NULL
  AND (@CompanyId IS NULL OR c.company_id = @CompanyId)
UNION ALL
SELECT 'tasks' AS entity, COUNT(*) AS invalid_team_refs
FROM tasks tk
LEFT JOIN teams t ON t.company_id = tk.company_id AND t.team_id = tk.team_id
WHERE tk.team_id IS NOT NULL
  AND t.team_id IS NULL
  AND (@CompanyId IS NULL OR tk.company_id = @CompanyId)
UNION ALL
SELECT 'products' AS entity, COUNT(*) AS invalid_team_refs
FROM products p
LEFT JOIN teams t ON t.company_id = p.company_id AND t.team_id = p.team_id
WHERE p.team_id IS NOT NULL
  AND t.team_id IS NULL
  AND (@CompanyId IS NULL OR p.company_id = @CompanyId);

-- Users without any team membership in companies that already have teams
SELECT u.company_id, u.user_id, u.name, u.role
FROM users u
WHERE u.is_active = 1
  AND EXISTS (
    SELECT 1
    FROM teams t
    WHERE t.company_id = u.company_id
      AND t.is_active = 1
  )
  AND NOT EXISTS (
    SELECT 1
    FROM (
      SELECT company_id, user_id
      FROM team_members
      WHERE is_active = 1
      UNION
      SELECT company_id, user_id
      FROM team_managers
      WHERE is_active = 1
    ) scoped_users
    WHERE scoped_users.company_id = u.company_id
      AND scoped_users.user_id = u.user_id
  )
  AND (@CompanyId IS NULL OR u.company_id = @CompanyId)
ORDER BY u.company_id, u.name;

-- Manager-to-team visibility summary
SELECT tm.company_id, tm.user_id, u.name, COUNT(*) AS managed_team_count
FROM team_managers tm
INNER JOIN users u ON u.company_id = tm.company_id AND u.user_id = tm.user_id
WHERE tm.is_active = 1
  AND (@CompanyId IS NULL OR tm.company_id = @CompanyId)
GROUP BY tm.company_id, tm.user_id, u.name
ORDER BY tm.company_id, managed_team_count DESC, u.name;

-- Team ownership mix by entity
SELECT 'leads' AS entity, team_id, COUNT(*) AS total_records
FROM leads
WHERE team_id IS NOT NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY team_id
UNION ALL
SELECT 'customers' AS entity, team_id, COUNT(*) AS total_records
FROM customers
WHERE team_id IS NOT NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY team_id
UNION ALL
SELECT 'tasks' AS entity, team_id, COUNT(*) AS total_records
FROM tasks
WHERE team_id IS NOT NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY team_id
UNION ALL
SELECT 'products' AS entity, team_id, COUNT(*) AS total_records
FROM products
WHERE team_id IS NOT NULL AND (@CompanyId IS NULL OR company_id = @CompanyId)
GROUP BY team_id;
