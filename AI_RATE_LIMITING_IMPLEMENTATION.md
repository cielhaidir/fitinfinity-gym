# AI Rate Limiting Implementation for FitInfinity

## Overview
This implementation adds comprehensive AI rate limiting to the FitInfinity application, specifically for the body composition analysis feature, with extensibility for future AI features like calorie calculator.

## Features Implemented

### 1. Database Schema
- **AIRateLimit Model**: Stores user-specific rate limits for different AI request types
- **AIRequestLog Model**: Logs all AI requests for monitoring and analytics
- **AIRequestType Enum**: BODY_COMPOSITION, CALORIE_CALCULATOR, GENERAL

### 2. Environment Configuration
New environment variables added to `.env`:
```env
AI_DEFAULT_DAILY_LIMIT=5
AI_DEFAULT_WEEKLY_LIMIT=20
AI_DEFAULT_MONTHLY_LIMIT=50
AI_ENABLE_RATE_LIMITING=true
AI_ADMIN_OVERRIDE=false
```

### 3. Core Services

#### AIRateLimitService (`src/server/utils/aiRateLimitService.ts`)
- **Rate Limit Checking**: Validates if users can make AI requests
- **Usage Tracking**: Monitors daily, weekly, and monthly usage
- **Request Logging**: Records all AI requests with metadata
- **Limit Management**: Allows admins to update user limits
- **Statistics**: Provides analytics for admin dashboard

#### Key Methods:
- `canMakeRequest()`: Check if user can make AI request
- `executeWithRateLimit()`: Wrapper for AI functions with rate limiting
- `getUserUsage()`: Get current usage statistics
- `logRequest()`: Log AI request attempts

### 4. API Routes

#### AI Rate Limit Router (`src/server/api/routers/aiRateLimit.ts`)
- **User Endpoints**:
  - `getMyStatus`: Get current rate limit status
  - `getMyLimit`: Get limits for specific request type
  - `updateMyLimits`: Self-manage limits (can only reduce)
  - `canMakeRequest`: Check if request is allowed
  - `getMyRequestHistory`: View request history

- **Admin Endpoints**:
  - `admin.getAllUsersStatus`: View all users' limits
  - `admin.updateUserLimits`: Modify any user's limits
  - `admin.getStats`: Rate limiting statistics
  - `admin.getUserRequestLogs`: Detailed request logs

### 5. Updated Tracking Router
Enhanced existing tracking endpoints with rate limiting:
- `processImage`: Single image AI analysis with rate limiting
- `processMultipleImages`: Multiple image AI analysis with rate limiting
- `extractOCR`: OCR with AI enhancement and rate limiting

### 6. User Interface Components

#### AIRateLimitStatus Component (`src/app/_components/AIRateLimitStatus.tsx`)
- **Visual Usage Indicators**: Progress bars for daily/weekly/monthly limits
- **Request History**: View past AI requests
- **Limit Management**: Edit personal limits
- **Status Badges**: Real-time availability indicators

#### AI Limits Management Page (`src/app/(authenticated)/member/ai-limits/page.tsx`)
- **Comprehensive Dashboard**: Full rate limit management
- **Educational Content**: Explains how limits work
- **Feature Overview**: Shows available AI features

#### Enhanced Body Composition Page
- **Rate Limit Indicator**: Shows AI availability status
- **Warning Messages**: Alerts when limits are reached
- **Quick Management**: Link to AI limits page

## User Experience

### For Regular Users
1. **Transparent Limits**: Users see their current usage and limits
2. **Self-Management**: Users can reduce their own limits
3. **Clear Feedback**: Immediate notification when limits are reached
4. **Usage History**: View past AI requests and their status

### For Administrators
1. **Global Overview**: See all users' rate limit status
2. **Flexible Management**: Increase/decrease any user's limits
3. **Analytics**: Comprehensive statistics and usage patterns
4. **Monitoring**: Detailed request logs with error tracking

## Rate Limiting Logic

### Three-Tier System
1. **Daily Limits**: Reset at midnight, for regular daily usage
2. **Weekly Limits**: Reset on Sundays, prevent weekly overconsumption
3. **Monthly Limits**: Reset on 1st of month, overall usage control

### Enforcement Rules
- All three limits must allow the request
- Failed AI requests don't count towards limits
- Rate limiting can be globally disabled via environment variable
- Admin override available for special cases

### Default Limits
- **Daily**: 5 requests
- **Weekly**: 20 requests  
- **Monthly**: 50 requests

## Security Features

1. **User Isolation**: Users can only see/modify their own limits
2. **Admin Protection**: Admin endpoints require role validation (TODO: implement)
3. **Request Logging**: All attempts logged with IP and user agent
4. **Error Handling**: Graceful degradation when rate limits exceeded

## Extensibility

### Adding New AI Features
1. Add new enum value to `AIRequestType`
2. Update UI labels in components
3. Implement rate limiting in new AI endpoints
4. Users automatically get default limits for new features

### Future Enhancements
- **Dynamic Limits**: Adjust limits based on user subscription tier
- **Burst Allowance**: Temporary limit increases for premium users
- **Usage Analytics**: Detailed usage patterns and recommendations
- **Smart Quotas**: AI-driven limit adjustments based on usage patterns

## Configuration Options

### Environment Variables
- `AI_ENABLE_RATE_LIMITING`: Global on/off switch
- `AI_DEFAULT_*_LIMIT`: Default limits for new users
- `AI_ADMIN_OVERRIDE`: Allow admin bypass of rate limits

### Per-User Customization
- Individual daily/weekly/monthly limits
- Per-feature limit configuration
- Self-service limit reduction
- Admin-controlled limit increases

## Monitoring and Analytics

### Request Logging
- Success/failure rates
- Processing times
- Error messages
- User agent and IP tracking

### Usage Statistics
- Top users by request volume
- Requests by feature type
- Success rates over time
- Peak usage patterns

## Integration Points

### Existing Systems
- ✅ **Tracking System**: Body composition analysis
- 🔄 **Future**: Calorie calculator integration
- 🔄 **Future**: General AI assistant features

### Database
- ✅ **Migration**: Added new tables for rate limiting
- ✅ **Relations**: Proper foreign keys and indexes
- ✅ **Performance**: Optimized queries for rate checking

## Error Handling

### Rate Limit Exceeded
- Returns `TOO_MANY_REQUESTS` error code
- Includes current usage and limits in response
- Provides clear error messages to users

### Service Failures
- Rate limiting failures don't block AI requests
- Logging failures are non-blocking
- Graceful degradation when database unavailable

## Testing Considerations

### Unit Tests Needed
- Rate limit calculation logic
- Usage tracking accuracy
- Limit enforcement rules
- Error handling scenarios

### Integration Tests
- End-to-end AI request flow with rate limiting
- Database transaction handling
- Multi-user concurrent requests
- Limit reset timing

## Deployment Notes

1. **Database Migration**: Run Prisma migration for new tables
2. **Environment Setup**: Configure rate limiting variables
3. **Feature Flags**: Enable/disable rate limiting per environment
4. **Monitoring**: Set up alerts for high usage or failures

## Performance Considerations

- **Efficient Queries**: Indexed database lookups for rate checking
- **Minimal Overhead**: Fast rate limit validation
- **Async Logging**: Non-blocking request logging
- **Caching**: Consider Redis for high-traffic scenarios

This implementation provides a robust, user-friendly, and scalable rate limiting system that can grow with the application's AI features while maintaining performance and user experience.