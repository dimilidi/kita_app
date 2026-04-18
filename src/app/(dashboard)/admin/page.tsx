
import Announcements from "@/components/Announcements";
import AttendanceChartContainer from "@/components/AttendanceChartContainer";
import AttendanceOverviewChartContainer from "@/components/AttendanceOverviewChartContainer";
import CountChartContainer from "@/components/CountChartContainer";
import DashboardEvents from "@/components/DashboardEvents";
import UserCardsSection from "@/components/UserCardsSection";

const AdminPage = ({
  searchParams,
}: {
  searchParams: { [keys: string]: string | undefined };
}) => {
  return (
    <div className="p-4 flex gap-4 flex-col md:flex-row">
      {/* LEFT */}
      <div className="w-full lg:w-2/3 flex flex-col gap-8">
        {/* USER CARDS */}
        <UserCardsSection searchParams={searchParams} />
        {/* MIDDLE CHARTS */}
        <div className="flex gap-4 flex-col lg:flex-row">
          {/* COUNT CHART */}
          <div className="w-full lg:w-1/3 h-[450px]">
            <CountChartContainer />
          </div>
          {/* ATTENDANCE CHART */}
          <div className="w-full lg:w-2/3 h-[450px]">
            <AttendanceChartContainer />
          </div>
        </div>
        {/* BOTTOM CHART — attendance trends (children + educators) */}
        <div className="w-full min-h-[480px] h-[500px]">
          <AttendanceOverviewChartContainer />
        </div>
      </div>
      {/* RIGHT */}
      <div className="w-full lg:w-1/3 flex flex-col gap-8">
        <DashboardEvents />
        <Announcements />
      </div>
    </div>
  );
};

export default AdminPage;
