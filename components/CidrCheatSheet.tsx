export default function CidrCheatSheet() {
  const commonCidrs = [
    { cidr: "/8", mask: "255.0.0.0", hosts: "16,777,214", use: "Massive ISP Blocks" },
    { cidr: "/16", mask: "255.255.0.0", hosts: "65,534", use: "Large Enterprise Networks" },
    { cidr: "/22", mask: "255.255.252.0", hosts: "1,022", use: "Medium Office LAN" },
    { cidr: "/24", mask: "255.255.255.0", hosts: "254", use: "Standard Home/Small LAN" },
    { cidr: "/26", mask: "255.255.255.192", hosts: "62", use: "Segmented VLAN" },
    { cidr: "/28", mask: "255.255.255.240", hosts: "14", use: "Small DMZ / Server Block" },
    { cidr: "/30", mask: "255.255.255.252", hosts: "2", use: "Point-to-Point Links" },
    { cidr: "/32", mask: "255.255.255.255", hosts: "1", use: "Single Host Route / Loopback" }
  ];

  return (
    <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
          <tr>
            <th className="px-4 py-3">CIDR</th>
            <th className="px-4 py-3">Subnet Mask</th>
            <th className="px-4 py-3">Usable Hosts</th>
            <th className="px-4 py-3">Typical Use Case</th>
          </tr>
        </thead>
        <tbody>
          {commonCidrs.map((item) => (
            <tr
              key={item.cidr}
              className="border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
            >
              <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">{item.cidr}</td>
              <td className="px-4 py-3 font-mono text-gray-700 dark:text-gray-300">{item.mask}</td>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{item.hosts}</td>
              <td className="px-4 py-3 text-gray-500">{item.use}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
