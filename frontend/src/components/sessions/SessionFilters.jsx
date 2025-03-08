import PropTypes from 'prop-types';

const SessionFilters = ({ filters, onFilterChange }) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    onFilterChange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="session-filters">
      <div className="search-filter">
        <input
          type="text"
          name="search"
          value={filters.search}
          onChange={handleChange}
          placeholder="Search sessions..."
        />
      </div>

      <div className="filter-group">
        <select
          name="status"
          value={filters.status}
          onChange={handleChange}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
        </select>

        <select
          name="language"
          value={filters.language}
          onChange={handleChange}
        >
          <option value="all">All Languages</option>
          <option value="javascript">JavaScript</option>
          <option value="python">Python</option>
          <option value="java">Java</option>
          <option value="cpp">C++</option>
          <option value="csharp">C#</option>
        </select>

        <select
          name="dateRange"
          value={filters.dateRange}
          onChange={handleChange}
        >
          <option value="all">All Time</option>
          <option value="today">Today</option>
          <option value="week">This Week</option>
          <option value="month">This Month</option>
        </select>

        <select
          name="privacy"
          value={filters.privacy}
          onChange={handleChange}
        >
          <option value="all">All Sessions</option>
          <option value="public">Public Only</option>
          <option value="private">Private Only</option>
        </select>
      </div>
    </div>
  );
};

SessionFilters.propTypes = {
  filters: PropTypes.shape({
    search: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
    language: PropTypes.string.isRequired,
    dateRange: PropTypes.string.isRequired,
    privacy: PropTypes.string.isRequired
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired
};

export default SessionFilters; 