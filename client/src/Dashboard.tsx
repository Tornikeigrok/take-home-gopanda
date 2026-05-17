import React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Cookies from "js-cookie";
import { getUrl } from "./ApiCall";
import { motion } from "framer-motion";

//--- Interface for the result of returning all rooms
interface roomsRule {
  name: string;
  capacity: number;
  purpose: string;
  is_active: boolean;
  created_at: string;
}

interface UserInfo {
  userEml?: string;
  userName?: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const token = Cookies.get("access-token");
    if (!token) {
      navigate("/");
    }
  }, []);

  //--- This API returns the current user's details to display and use for profile
  const [userInfo, setUserInfo] = useState<UserInfo | undefined>();
  useEffect(() => {
    const currentUserInfo = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("userInfo"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const data = await res.json();
          console.log(data);
          setUserInfo(data);
        }
      } catch (error) {
        console.error(error);
      }
    };
    currentUserInfo();
  }, []);

  //--- API call to fetch every room to display
  const [rooms, setRooms] = useState<roomsRule[]>([]);
  useEffect(() => {
    const displayAllRooms = async () => {
      const token = Cookies.get("access-token");
      try {
        const res = await fetch(getUrl("roomList"), {
          method: "GET",
          headers: { Authorization: "Bearer " + token },
        });
        if (res.ok) {
          const data = await res.json();
          console.log(data);
          setRooms(data.rooms);
        }
      } catch (error) {
        console.error(error);
      }
    };
    displayAllRooms();
  }, []);

  

  const filterRooms = [...rooms].sort((a, b) => a.capacity - b.capacity);

  const [sortByCapacity, setSortByCapacity] = useState<"none" | "asc" | "desc">("none");
  const [nameFilter, setNameFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "tentative" | "confirmed">("all");

  const uniqueRoomNames = Array.from(new Set(rooms.map((r) => r.name)));

  const statusOptions: { value: typeof statusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "tentative", label: "Tentative" },
    { value: "confirmed", label: "Confirmed" },
  ];

  const profileInitial = userInfo?.userName
    ? userInfo.userName.trim().charAt(0).toUpperCase()
    : "?";

  return (
    <div className="min-h-screen text-neutral-900">
      <header className="sticky top-0 z-20 backdrop-blur-md bg-white/60 border-b border-white/40">
        <nav className="w-11/12 max-w-6xl mx-auto flex items-center justify-between py-3 md:py-4">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-neutral-900 text-white text-sm font-bold">
              M
            </span>
            <span className="text-lg md:text-xl font-bold tracking-tight">
              MeetMe
            </span>
          </div>

          <button
            type="button"
            onClick={() => navigate("/profile")}
            className="flex items-center gap-2 rounded-full border border-neutral-300 bg-white/80
                       hover:bg-white hover:border-neutral-400 pl-1 pr-3 py-1 transition-all duration-200 cursor-pointer"
            title="Go to profile"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-neutral-900 text-white text-xs font-bold">
              {profileInitial}
            </span>
            <span className="text-sm font-medium max-w-[140px] truncate">
              {userInfo?.userName ?? "Profile"}
            </span>
          </button>
        </nav>
      </header>

      <main className="w-11/12 max-w-6xl mx-auto px-2 py-10 md:py-14">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8 md:mb-10">
          <div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight">
              Available rooms
            </h1>
            <p className="mt-2 text-sm md:text-base text-neutral-600">
              Browse {rooms.length} room{rooms.length === 1 ? "" : "s"} and pick
              the one that fits your team.
            </p>
          </div>
        </div>


        {/* --- This is the filtering section --- */}
        
        <div className="mb-6 md:mb-8 rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60 shadow-sm p-4 md:p-5">
          <div className="flex flex-col lg:flex-row lg:items-end gap-4 lg:gap-6">
            <label className="flex flex-col gap-1.5 lg:w-56">
              <span className="text-xs font-medium text-neutral-700">Sort by capacity</span>
              <div className="relative">
                <select
                  value={sortByCapacity}
                  onChange={(e) => setSortByCapacity(e.target.value as typeof sortByCapacity)}
                  className="w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm
                             focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                >
                  <option value="none">Default</option>
                  <option value="asc">Low to high</option>
                  <option value="desc">High to low</option>
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">
                  ▾
                </span>
              </div>
            </label>

            <label className="flex flex-col gap-1.5 lg:w-64">
              <span className="text-xs font-medium text-neutral-700">Room name</span>
              <div className="relative">
                <select
                  value={nameFilter}
                  onChange={(e) => setNameFilter(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-9 text-sm
                             focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-all cursor-pointer"
                >
                  <option value="all">All rooms</option>
                  {uniqueRoomNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 text-xs">
                  ▾
                </span>
              </div>
            </label>

            <div className="flex flex-col gap-1.5 flex-1">
              <span className="text-xs font-medium text-neutral-700">Status</span>
              <div className="inline-flex flex-wrap gap-1.5 rounded-full bg-neutral-100 border border-neutral-200 p-1 w-fit">
                {statusOptions.map((opt) => {
                  const active = statusFilter === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatusFilter(opt.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
                        active
                          ? "bg-neutral-900 text-white shadow-sm"
                          : "text-neutral-600 hover:text-neutral-900"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>


        {/* --- This section is displaying all the rooms. Also checks if there are no rooms to render text accordingly --- */}
        {rooms.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-white/60 p-10 text-center">
            <p className="text-neutral-600">No rooms available right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {rooms.map((data, i) => (
              <motion.article
                initial={{ opacity: 0, filter: "blur(6px)", y: 12 }}
                whileInView={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                transition={{
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                  delay: i * 0.04,
                }}
                viewport={{ once: true }}
                key={i}
                className="group relative rounded-2xl bg-white/70 backdrop-blur-sm border border-white/60
                           p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:scale-110 transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-5">
                  <h3 className="text-lg font-semibold tracking-tight leading-snug">
                    {data.name}
                  </h3>
                  <span
                    className={`shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      data.is_active
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-neutral-100 text-neutral-500 border border-neutral-200"
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        data.is_active ? "bg-emerald-500" : "bg-neutral-400"
                      }`}
                    />
                    {data.is_active ? "Active" : "Inactive"}
                  </span>
                </div>

                <dl className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-neutral-500">Capacity</dt>
                    <dd className="font-medium">
                      {data.capacity}{" "}
                      {data.capacity === 1 ? "person" : "people"}
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3">
                    <dt className="text-neutral-500 shrink-0">Purpose</dt>
                    <dd
                      className="font-medium text-right max-w-[65%] truncate"
                      title={data.purpose}
                    >
                      {data.purpose}
                    </dd>
                  </div>
                </dl>

                <button
                  type="button"
                  disabled={!data.is_active}
                  className="mt-6 w-full bg-neutral-900 text-white rounded-full py-2 text-sm font-medium
                             hover:bg-neutral-800 transition-all duration-200 cursor-pointer
                             disabled:bg-neutral-300 disabled:cursor-not-allowed"
                >
                  {data.is_active ? "Book room" : "Unavailable"}
                </button>
              </motion.article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
export default Dashboard;
