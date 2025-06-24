# Attendance Management System

## Overview

The Attendance Management System provides comprehensive tracking and management of employee fingerprint attendance records with Excel export capabilities.

## Features

### 📊 Dashboard Statistics
- **Total Records**: View total attendance records
- **Completed Records**: Employees who have both check-in and check-out
- **Checked In Only**: Employees currently checked in (no check-out)
- **Unique Employees**: Number of different employees with attendance records

### 🔍 Advanced Filtering
- **Date Range**: Filter by start and end dates
- **Search Options**:
  - Employee Name
  - Device ID
  - Fingerprint ID
- **Attendance Type**:
  - All Records
  - Check In Only
  - Check Out Only

### 📋 Attendance Records Table
- Employee information (name, email)
- Fingerprint ID
- Date and time stamps
- Check-in and check-out times
- Device ID used
- Status (Complete/Checked In)
- Duration calculation

### 📥 Excel Export
- Export filtered data to Excel format
- Includes all visible columns plus duration calculation
- Automatic filename generation with date range
- Download directly from browser

## Installation

### 1. Install Dependencies
```bash
# Run the installation script
chmod +x scripts/install-attendance-deps.sh
./scripts/install-attendance-deps.sh

# Or install manually
npm install xlsx@^0.18.5 @types/xlsx@^0.0.36
```

### 2. Database Setup
The system uses existing attendance tables:
- `attendance` - Main attendance records
- `employee` - Employee information
- `user` - User details

## Usage

### Accessing the System
1. Navigate to **Management > Attendance Management** in the sidebar
2. Requires `menu:employees` permission

### Viewing Records
1. **Dashboard**: View real-time statistics at the top
2. **Filters**: Use date range and search filters to narrow results
3. **Table**: Browse paginated attendance records

### Exporting Data
1. Set desired filters (optional)
2. Click **Export Excel** button
3. File downloads automatically with format: `attendance_records_YYYY-MM-DD_to_YYYY-MM-DD_YYYY-MM-DD.xlsx`

### Search and Filter Options

#### Date Range Filter
- Select start and end dates using calendar widgets
- Leave empty for all-time records

#### Search Filter
- **Employee Name**: Search by employee's full name
- **Device ID**: Find records from specific devices
- **Fingerprint ID**: Search by fingerprint enrollment ID

#### Attendance Type Filter
- **All Records**: Show all attendance entries
- **Check In Only**: Show only incomplete records (no check-out)
- **Check Out Only**: Show only completed records

## API Endpoints

### `attendance.getAllHistory`
Retrieves paginated attendance records with filtering options.

**Input:**
```typescript
{
  startDate?: Date;
  endDate?: Date;
  page: number;
  limit: number;
  search?: string;
  searchType: "employee" | "device" | "fingerprint";
  attendanceType: "all" | "checkin" | "checkout";
}
```

### `attendance.exportToExcel`
Exports attendance data to Excel format.

**Input:**
```typescript
{
  startDate?: Date;
  endDate?: Date;
  search?: string;
  searchType: "employee" | "device" | "fingerprint";
  attendanceType: "all" | "checkin" | "checkout";
}
```

**Output:**
```typescript
{
  buffer: number[];
  filename: string;
}
```

### `attendance.getStats`
Retrieves attendance statistics for dashboard.

**Input:**
```typescript
{
  startDate?: Date;
  endDate?: Date;
}
```

**Output:**
```typescript
{
  totalRecords: number;
  checkedInOnly: number;
  completedRecords: number;
  uniqueEmployees: number;
}
```

## Excel Export Format

The exported Excel file includes these columns:
- **Employee Name**: Full name from user table
- **Employee Email**: Email address
- **Fingerprint ID**: Enrolled fingerprint ID
- **Date**: Attendance date (DD/MM/YYYY)
- **Check In**: Check-in timestamp
- **Check Out**: Check-out timestamp (if available)
- **Device ID**: Device used for attendance
- **Status**: Complete or Checked In
- **Duration (Hours)**: Calculated work hours (if check-out exists)

## Permissions

Required permissions:
- `menu:employees` - Access to attendance management
- `list:employees` - View attendance records

## Technical Details

### File Structure
```
src/
├── app/(authenticated)/management/attendance/
│   └── page.tsx                    # Main attendance management page
├── server/api/routers/
│   └── attendance.ts               # tRPC router with endpoints
└── lib/
    └── menu.ts                     # Navigation menu configuration
```

### Dependencies
- `xlsx` - Excel file generation
- `@types/xlsx` - TypeScript definitions
- `date-fns` - Date formatting
- `lucide-react` - Icons

### Performance Considerations
- Pagination limits large datasets
- Indexed database queries for efficient filtering
- Client-side Excel generation for better performance

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Ensure user has `menu:employees` permission
   - Check role assignments

2. **Export Not Working**
   - Verify xlsx package is installed
   - Check browser console for errors
   - Ensure popup blockers allow downloads

3. **No Data Showing**
   - Check date range filters
   - Verify attendance records exist in database
   - Clear all filters and try again

### Debug Mode
Enable debug logging by checking browser console for:
- API request/response logs
- Export process logs
- Filter application logs

## Future Enhancements

Potential improvements:
- Real-time updates via WebSocket
- Advanced reporting with charts
- Bulk attendance operations
- Integration with payroll systems
- Mobile app support
- Automated report scheduling