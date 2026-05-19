CREATE TABLE IF NOT EXISTS quotes (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  customer_name VARCHAR(255) NOT NULL,
  tax_id VARCHAR(64) NULL,
  expiry_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'Draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_quotes_created_at (created_at),
  KEY idx_quotes_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_items (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  quote_id BIGINT UNSIGNED NOT NULL,
  description VARCHAR(500) NOT NULL,
  qty INT NOT NULL DEFAULT 0,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY idx_quote_items_quote_id (quote_id),
  CONSTRAINT fk_quote_items_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS quote_approvals (
  quote_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'LinkCreated',
  approver_name VARCHAR(255) NULL,
  approved_at TIMESTAMP NULL,
  signature_path VARCHAR(500) NULL,
  id_doc_path VARCHAR(500) NULL,
  verified_at TIMESTAMP NULL,
  PRIMARY KEY (quote_id),
  UNIQUE KEY uq_quote_approvals_token_hash (token_hash),
  CONSTRAINT fk_quote_approvals_quote
    FOREIGN KEY (quote_id) REFERENCES quotes(id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

