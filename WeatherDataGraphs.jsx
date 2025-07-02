import React, { useEffect, useRef, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import styles from "./WeatherDataGraphs.module.css";
import Loader from "react-js-loader";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import "../../i18n";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

// Utility function to format a single ISO timestamp
const formatTimestamp = (isoString) => {
  if (!isoString) return "Invalid Timestamp";
  const date = new Date(isoString);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${month}-${day} ${hours}:${minutes}`;
};

// Function to format an array of timestamps
const formatTimestamps = (timestamps) => {
  if (!Array.isArray(timestamps)) return [];
  return timestamps.map((timestamp) => formatTimestamp(timestamp));
};

// Function to format data for the chart
const formatData = (types, timestamps, dataArray, colors) => {
  // Validate inputs
  if (
    !Array.isArray(types) ||
    !Array.isArray(timestamps) ||
    !Array.isArray(dataArray)
  ) {
    console.error(
      "Invalid input: types, timestamps, and dataArray must be arrays",
      {
        types,
        timestamps,
        dataArray,
      }
    );
    return {
      labels: [],
      datasets: [],
    };
  }

  // Default colors if props.colors is not provided or insufficient
  const defaultColors = [
    {
      borderColor: "rgb(255, 206, 86)",
      backgroundColor: "rgba(255, 206, 86, 0.2)",
    }, // Yellow
    {
      borderColor: "rgb(54, 162, 235)",
      backgroundColor: "rgba(54, 162, 235, 0.2)",
    }, // Blue
    {
      borderColor: "rgb(255, 99, 132)",
      backgroundColor: "rgba(255, 99, 132, 0.2)",
    }, // Red
    {
      borderColor: "rgb(75, 192, 192)",
      backgroundColor: "rgba(75, 192, 192, 0.2)",
    }, // Cyan
  ];

  // Create datasets dynamically based on types
  const datasets = types.map((type, index) => {
    const color =
      colors && colors[index]
        ? {
            borderColor: colors[index].borderColor || colors[index],
            backgroundColor:
              colors[index].backgroundColor || `${colors[index]}4D`, // Add transparency if not specified
          }
        : defaultColors[index % defaultColors.length]; // Fallback to default colors

    return {
      label: type,
      data: Array.isArray(dataArray[index]) ? dataArray[index] : [], // Ensure data is an array
      borderColor: color.borderColor,
      backgroundColor: color.backgroundColor,
      fill: false,
      tension: 0.4, // Smooth lines
    };
  });

  return {
    labels: formatTimestamps(timestamps),
    datasets,
  };
};

// Plugin to draw a vertical hover line
const verticalLinePlugin = {
  id: "verticalLinePlugin",
  afterDatasetsDraw(chart) {
    const {
      ctx,
      tooltip,
      chartArea: { left, right, top, bottom },
      scales: { x },
    } = chart;

    if (tooltip?._active?.length) {
      const activePoint = tooltip._active[0];
      const xCoor = x.getPixelForValue(activePoint.index);

      // Save the current context state
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(xCoor, top);
      ctx.lineTo(xCoor, bottom);
      ctx.lineWidth = 2;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.5)"; // Customize color and opacity
      ctx.stroke();
      ctx.restore();
    }
  },
};

// Register the plugin
ChartJS.register(verticalLinePlugin);

const WeatherDataGraphs = (props) => {
  const { t } = useTranslation();
  const chartRef = useRef(null);
  const today = new Date();
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("Range");
  const [selectedFilterButton, setSelectedFilterButton] = useState("oneD");
  const [dataSize, setDataSize] = useState(0);
  const [selectedStartDate, setSelectedStartDate] = useState(
    props.startDate || today
  );
  const [selectedEndDate, setSelectedEndDate] = useState(
    props.endDate || today
  );

  // Effect to notify parent when dates change
  // useEffect(() => {
  //   if (props.onDateChange) {
  //     props.onDateChange({
  //       startDate: selectedStartDate,
  //       endDate: selectedEndDate,
  //       filter: selectedFilter
  //     });
  //   }
  // }, [selectedStartDate, selectedEndDate, selectedFilter]);

  // Format data for the chart
  const data = formatData(props.types, props.time, props.data, props.colors);

  // Chart.js options
  const options = {
    animation: {
      onComplete: (e) => {
          // console.log(e.chart.config._config.data.labels.length);
          if (e.chart.config._config.data.labels.length != dataSize) {
            setDataSize(e.chart.config._config.data.labels.length);
            setLoading(false)
          }
      }
    },
    responsive: true,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      tooltip: {
        enabled: true, // Ensure tooltips are enabled for the hover effect
      },
      legend: {
        position: "top",
        align: "center",
        labels: {
          boxWidth: 40,
          padding: 20,
        },
        floating: true,
        offsetY: -25, // Approximated with padding
      },
      title: {
        display: true,
        text: `\t${t("chartTitles.dataPer")}${props.timeline}`,
        align: "start",
        font: {
          family: "Arial, sans-serif", // Explicit font family
          size: 16, // Increased size for visibility
        },
        padding: {
          top: 20, // Increased margin above title
          bottom: 30, // Increased margin below title
          left: 10, // Positive left margin
          right: 20, // Margin to the right
        },
      },
    },
  };

  const filterButtons = [
    {
      key: "oneD",
      label: t("filterTooltips.oneD"),
      filter: "Hourly",
      action: () => {
        if (selectedFilterButton === "oneD") return;
        setSelectedFilterButton("oneD");
        const currentDate = new Date();
        const start = new Date(currentDate.getTime() - 24 * 60 * 60 * 1000);
        const end = currentDate;
        setSelectedStartDate(start);
        setSelectedEndDate(end);
        setSelectedFilter("Hourly");
        props.filterChange("Hourly");
        setLoading(true);
      },
    },
    {
      key: "oneW",
      label: t("filterTooltips.oneW"),
      filter: "Daily",
      action: () => {
        if (selectedFilterButton === "oneW") return;
        setSelectedFilterButton("oneW");
        const currentDate = new Date();
        const start = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const end = currentDate;
        setSelectedStartDate(start);
        setSelectedEndDate(end);
        setSelectedFilter("Daily");
        props.filterChange("Daily");
        setLoading(true);
      },
    },
    {
      key: "oneM",
      label: t("filterTooltips.oneM"),
      filter: "Monthly", 
      action: () => {
        if (selectedFilterButton === "oneM") return;
        setSelectedFilterButton("oneM");
        const currentDate = new Date();
        const start = new Date(
          currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
        );
        const end = currentDate;
        setSelectedStartDate(start);
        setSelectedEndDate(end);
        setSelectedFilter("Monthly");
        props.filterChange("Monthly");
        setLoading(true);
      },
    },
  ];

  // useEffect(() => {
  //   props.filterChange("Hourly");
  //   console.log(props.data)
  // }, [selectedFilterButton])

  return (
    <div id="chart" className={styles.chart_section}>
      <div style={{ height: "100%" }}>
        <div className={styles.toolbarAndFilter}>
          <div className={styles.FilterSection}>
            <div className={styles.filterButtons}>
              {filterButtons.map(({ key, label, action }) => (
                <button
                  key={key}
                  className={`${styles.filterButton} ${
                    selectedFilterButton === key ? styles.activeFilter : ""
                  }`}
                  onClick={action}
                  disabled={selectedFilterButton === key}
                >
                  {label}
                </button>
              ))}
              
            </div>
            
          </div>
        </div>
      </div>

      <div className={`${styles.chartContainer}`}>
          {(loading || props.leftLoad) && (
            <div className={styles.loadingOverlay}>
              {t("chartTitles.update")}
            </div>
          )}
      <div
        className={`${styles.chartWrapper} ${
          loading || props.leftLoad ? styles.blur : ""
        }`}
      >
        {(loading || props.leftLoad) && (
          <div className={styles.loadingOverlay}>{t("chartTitles.update")}</div>
        )}
        <Line options={options} data={data} ref={chartRef} />
      </div>
      </div>
    </div>
  );
};

export default WeatherDataGraphs;
