# Wave 1B: API Response Types & Error Handling - Usage Examples

## Overview

Wave 1B introduces type-safe API response schemas and discriminated union error handling for the debateUI application.

## API Response Types

### TurnResponse

Represents a single turn in a debate:

```typescript
import { parseTurnResponse, type TurnResponse } from '@debateui/core';
import * as E from 'fp-ts/Either';

// Example API response
const apiResponse = {
  turnId: '123e4567-e89b-12d3-a456-426614174000',
  branchId: '223e4567-e89b-12d3-a456-426614174000',
  participantId: 'claude-3-opus',
  participantType: 'model',
  content: 'I believe that...',
  confidence: 0.85,
  tokensUsed: 150,
  costUsd: 0.0025,
  latencyMs: 1200,
  createdAt: '2025-12-01T10:30:00Z',
};

// Parse with fp-ts Either for type-safe error handling
const result = parseTurnResponse(apiResponse);

if (E.isRight(result)) {
  const turn: TurnResponse = result.right;
  console.log(`Turn ${turn.turnId} by ${turn.participantId}`);
} else {
  console.error('Validation failed:', result.left.issues);
}
```

### DebateResponse

Represents a full debate with all turns:

```typescript
import { parseDebateResponse, type DebateResponse } from '@debateui/core';
import * as E from 'fp-ts/Either';

const apiResponse = {
  debateId: '123e4567-e89b-12d3-a456-426614174000',
  status: 'running',
  question: 'Is AI beneficial for humanity?',
  currentRound: 2,
  totalRounds: 5,
  turns: [
    // ... turn objects
  ],
  createdAt: '2025-12-01T10:00:00Z',
  updatedAt: '2025-12-01T10:30:00Z',
};

const result = parseDebateResponse(apiResponse);

if (E.isRight(result)) {
  const debate: DebateResponse = result.right;
  console.log(`Debate ${debate.debateId}: Round ${debate.currentRound}/${debate.totalRounds}`);
}
```

### BranchInfo

Represents branch metadata for debate forking:

```typescript
import { parseBranchInfo, type BranchInfo } from '@debateui/core';

const branchData = {
  branchId: '123e4567-e89b-12d3-a456-426614174000',
  parentBranchId: null, // Root branch
  forkTurnId: null,
  name: 'main',
  forkMode: 'save',
  depth: 0,
  createdAt: '2025-12-01T10:00:00Z',
};

const result = parseBranchInfo(branchData);
```

## Error Handling

### Discriminated Union Pattern

All API errors use a discriminated union with exhaustive pattern matching:

```typescript
import {
  type ApiError,
  isNetworkError,
  isValidationError,
  isNotFoundError,
  formatApiError,
} from '@debateui/core';

function handleApiError(error: ApiError): string {
  // Type guards enable exhaustive pattern matching
  if (isNetworkError(error)) {
    return `Connection failed: ${error.message}`;
  }

  if (isValidationError(error)) {
    return `Invalid data: ${error.errors.issues.map(i => i.message).join(', ')}`;
  }

  if (isNotFoundError(error)) {
    return `${error.resource} with id ${error.id} not found`;
  }

  // ... handle other error types

  // Fallback formatter
  return formatApiError(error);
}
```

### Error Constructors

Create API errors using type-safe constructors:

```typescript
import {
  networkError,
  validationError,
  authError,
  rateLimitError,
  notFoundError,
  conflictError,
  serverError,
} from '@debateui/core';
import { z } from 'zod';

// Network error
const netErr = networkError('Connection timeout', new Error('ETIMEDOUT'));

// Validation error (from Zod)
const schema = z.string();
const result = schema.safeParse(123);
if (!result.success) {
  const valErr = validationError(result.error);
}

// Auth error
const authErr = authError('Invalid token', 401);

// Rate limit error
const rateLimitErr = rateLimitError(5000); // Retry after 5000ms

// Not found error
const notFoundErr = notFoundError('debate', 'deb-123');

// Conflict error
const conflictErr = conflictError('Branch name already exists', 'branch-main');

// Server error
const serverErr = serverError(500, 'Internal server error');
```

### Switch-Case Exhaustiveness

The discriminated union enables compile-time exhaustiveness checking:

```typescript
function processError(error: ApiError): void {
  switch (error._tag) {
    case 'NetworkError':
      console.error(`Network: ${error.message}`);
      break;
    case 'ValidationError':
      console.error(`Validation: ${error.errors.issues.length} issues`);
      break;
    case 'AuthError':
      console.error(`Auth (${error.statusCode}): ${error.message}`);
      break;
    case 'RateLimitError':
      console.error(`Rate limited: retry after ${error.retryAfterMs}ms`);
      break;
    case 'NotFoundError':
      console.error(`Not found: ${error.resource} ${error.id}`);
      break;
    case 'ConflictError':
      console.error(`Conflict: ${error.message}`);
      break;
    case 'ServerError':
      console.error(`Server (${error.statusCode}): ${error.message}`);
      break;
    default:
      // TypeScript will error here if a case is missing
      const _exhaustive: never = error;
      console.error('Unknown error:', _exhaustive);
  }
}
```

### Error Formatting

Format any API error into a human-readable string:

```typescript
import { formatApiError, networkError } from '@debateui/core';

const error = networkError('Failed to connect', new Error('ECONNREFUSED'));
const formatted = formatApiError(error);
// Output: "Network Error: Failed to connect (Cause: ECONNREFUSED)"
```

## Integration with fp-ts

All parsers return `Either<ZodError, T>` for functional error handling:

```typescript
import { parseTurnResponse } from '@debateui/core';
import * as E from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';

const processApiResponse = (data: unknown) =>
  pipe(
    parseTurnResponse(data),
    E.fold(
      (error) => {
        console.error('Validation failed:', error.issues);
        return null;
      },
      (turn) => {
        console.log('Valid turn:', turn);
        return turn;
      }
    )
  );
```

## Type Safety Benefits

1. **Exhaustive Pattern Matching**: TypeScript ensures all error cases are handled
2. **Type Narrowing**: Type guards enable safe property access
3. **Compile-Time Validation**: Missing cases cause compilation errors
4. **Immutability**: All types use `readonly` properties
5. **Optional Property Safety**: `exactOptionalPropertyTypes` prevents `undefined` assignment bugs

## Test Coverage

- **57 total tests** (29 for errors, 28 for API responses)
- **100% code coverage** for all functions
- **Edge cases tested**: null/undefined inputs, invalid UUIDs, out-of-range values
- **Type safety verified**: Exhaustiveness checking, type guards, constructors
